import { getOrCreateSubject, getClientIp, getUserAgent, hashIpUa } from '../../../lib/subject.js';
import { findActiveSubscription, hasMatchPurchase, canUseDailyFree, consumeDailyFree, consumeSubscriptionDailyQuota, getUserIdFromEmail } from '../../../lib/access.js';
import { canUserAccessPrediction, recordPredictionAccess } from '../../../lib/subscription-limits.js';
import { getSession } from 'auth-astro/server';
import { query } from '../../../lib/db.js';

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const matchId = Number(body?.matchId);
    if (!Number.isFinite(matchId)) {
      return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 });
    }

    // Check if user is authenticated
    const session = await getSession(request);
    const userId = session?.user?.email ? await getUserIdFromEmail(session.user.email) : null;

    const AstroLike = { request, cookies };
    const { subjectId } = await getOrCreateSubject(AstroLike);
    const ip = getClientIp(AstroLike);
    const ua = getUserAgent(AstroLike);
    const { ipHash, uaHash } = hashIpUa(ip, ua);
    const today = new Date().toISOString().slice(0, 10);
    // Validate match id exists to avoid invalid FKs in logs/dfu
    const validRow = await query('SELECT id FROM matches WHERE id = ? LIMIT 1', [matchId]);
    const validMatchId = validRow?.[0]?.id ? Number(validRow[0].id) : null;

    // Pre-calc free availability for messaging & early reuse of prior grants
    const dfu = await query('SELECT count FROM daily_free_uses WHERE subject_id = ? AND date_utc = ? LIMIT 1', [subjectId, today]);
    const dfuCount = dfu?.[0]?.count ? Number(dfu[0].count) : 0;
    const ipUsed = await query('SELECT id FROM daily_ipua_uses WHERE date_utc = ? AND ip_hash = ? LIMIT 1', [today, ipHash]);
    const freeRemaining = (dfuCount >= 1 || ipUsed.length > 0) ? 0 : 1;

    // 1) Subscription
    // If already granted before for this subject+match, allow without extra checks
    const prior = await query('SELECT id FROM prediction_access_logs WHERE subject_id = ? AND match_id = ? LIMIT 1', [subjectId, matchId]);
    if (prior.length) {
      return new Response(JSON.stringify({ status: 'granted' }), { status: 200 });
    }

    // 1) Check authenticated user subscription FIRST
    if (userId) {
      console.log('🔍 Checking subscription access for userId:', userId);
      const accessCheck = await canUserAccessPrediction(userId);
      
      if (accessCheck.allowed) {
        console.log('🔍 Access allowed, recording usage for userId:', userId);
        // Registrar el acceso y actualizar contador
        const recorded = await recordPredictionAccess(userId);
        
        if (recorded && validMatchId != null) {
          await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
        }
        
        return new Response(JSON.stringify({ 
          status: 'granted',
          access_type: 'subscription',
          plan: accessCheck.plan_name,
          used: accessCheck.used + 1,
          limit: accessCheck.limit,
          remaining: accessCheck.limit ? Math.max(0, accessCheck.limit - (accessCheck.used + 1)) : null,
          message: accessCheck.limit ? 
            `Pronóstico desbloqueado. Te quedan ${Math.max(0, accessCheck.limit - (accessCheck.used + 1))} hoy.` :
            'Pronóstico desbloqueado con tu plan ilimitado.'
        }), { status: 200 });
      } else if (accessCheck.reason === 'daily_limit_exceeded') {
        return new Response(JSON.stringify({ 
          status: 'limit_exceeded',
          reason: 'Has alcanzado tu límite diario de pronósticos',
          used: accessCheck.used,
          limit: accessCheck.limit,
          plan: accessCheck.plan_name,
          access_type: 'subscription_limit_exceeded'
        }), { status: 403 });
      } else if (accessCheck.reason === 'no_subscription') {
        // Usuario autenticado pero sin suscripción - puede usar gratuito
        if (await canUseDailyFree(subjectId, ipHash, uaHash, today)) {
          await consumeDailyFree(subjectId, validMatchId, ipHash, uaHash, today);
          if (validMatchId != null) {
            await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
          }
          return new Response(JSON.stringify({ 
            status: 'granted',
            access_type: 'daily_free',
            message: 'Pronóstico gratuito desbloqueado. Mañana tendrás otro disponible.'
          }), { status: 200 });
        }
      }
    } else {
      // 2) Usuario NO autenticado - puede usar gratuito
      if (await canUseDailyFree(subjectId, ipHash, uaHash, today)) {
        await consumeDailyFree(subjectId, validMatchId, ipHash, uaHash, today);
        if (validMatchId != null) {
          await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
        }
        return new Response(JSON.stringify({ 
          status: 'granted',
          access_type: 'daily_free',
          message: 'Pronóstico gratuito desbloqueado. Mañana tendrás otro disponible.'
        }), { status: 200 });
      }
    }

    // 3) Check authenticated user match purchase (individual purchase)
    if (userId && await hasMatchPurchase(userId, matchId)) {
      if (validMatchId != null) {
        await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
      }
      return new Response(JSON.stringify({ 
        status: 'granted',
        access_type: 'individual_purchase',
        message: 'Partido comprado individualmente'
      }), { status: 200 });
    }

    // 4) Payment required → return pricing skeleton (server can enrich later)
    const plans = await query('SELECT code, `interval`, price_cents, currency, quota_per_day FROM plans WHERE active = 1 ORDER BY FIELD(code, "basic","advanced","pro"), `interval`');
    return new Response(JSON.stringify({ status: 'payment_required', reason: 'daily_free_limit_reached', free_remaining: freeRemaining, plans }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: (e && e.message) || '' }), { status: 500 });
  }
}



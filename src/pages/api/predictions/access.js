import { getOrCreateSubject, getClientIp, getUserAgent, hashIpUa } from '../../../lib/subject.js';
import { findActiveSubscription, hasMatchPurchase, canUseDailyFree, consumeDailyFree, consumeSubscriptionDailyQuota } from '../../../lib/access.js';
import { query } from '../../../lib/db.js';

export async function POST({ request, cookies }) {
  try {
    const body = await request.json();
    const matchId = Number(body?.matchId);
    if (!Number.isFinite(matchId)) {
      return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 });
    }

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

    const sub = await findActiveSubscription(subjectId);
    if (sub) {
      const isUnlimited = sub.quota_per_day == null;
      if (isUnlimited) {
        if (validMatchId != null) {
          await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
        }
        return new Response(JSON.stringify({ status: 'granted' }), { status: 200 });
      }
      // check used today
      const used = await query('SELECT used_count FROM subscription_daily_uses WHERE subscription_id = ? AND date_utc = ? LIMIT 1', [sub.subscription_id, today]);
      const usedCount = used?.[0]?.used_count ? Number(used[0].used_count) : 0;
      if (usedCount < Number(sub.quota_per_day)) {
        await consumeSubscriptionDailyQuota(sub.subscription_id, subjectId, today);
        if (validMatchId != null) {
          await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
        }
        return new Response(JSON.stringify({ status: 'granted' }), { status: 200 });
      }
      // quota exceeded
    }

    // 2) One-off purchase
    if (await hasMatchPurchase(subjectId, matchId)) {
      if (validMatchId != null) {
        await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
      }
      return new Response(JSON.stringify({ status: 'granted' }), { status: 200 });
    }

    // 3) Daily free: allow once per day per subject and IP/UA
    if (await canUseDailyFree(subjectId, ipHash, uaHash, today)) {
      await consumeDailyFree(subjectId, validMatchId, ipHash, uaHash, today);
      if (validMatchId != null) {
        await query('INSERT INTO prediction_access_logs (subject_id, match_id) VALUES (?, ?)', [subjectId, validMatchId]);
      }
      return new Response(JSON.stringify({ status: 'granted' }), { status: 200 });
    }

    // 4) Payment required → return pricing skeleton (server can enrich later)
    const plans = await query('SELECT code, `interval`, price_cents, currency, quota_per_day FROM plans WHERE active = 1 ORDER BY FIELD(code, "basic","advanced","pro"), `interval`');
    return new Response(JSON.stringify({ status: 'payment_required', reason: 'daily_free_limit_reached', free_remaining: freeRemaining, plans }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: (e && e.message) || '' }), { status: 500 });
  }
}



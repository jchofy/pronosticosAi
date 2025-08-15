import { getOrCreateSubject, getClientIp, getUserAgent, hashIpUa } from '../../../lib/subject.js';
import { findActiveSubscription, hasMatchPurchase, getUserIdFromEmail } from '../../../lib/access.js';
import { canUserAccessPrediction } from '../../../lib/subscription-limits.js';
import { query } from '../../../lib/db.js';
import { isGooglebot } from '../../../lib/bot.js';
import { getPredictionForMatch } from '../../../lib/matches.js';
import { getSession } from 'auth-astro/server';

export async function GET({ request, params, cookies }) {
  try {
    const matchId = Number(params.matchId);
    if (!Number.isFinite(matchId)) return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400 });

    // Googlebot flexible sampling
    const bot = await isGooglebot(request);
    if (bot) {
      const data = await getPredictionForMatch(matchId);
      return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
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

    // If already granted before for this subject+match, allow without extra checks
    const prior = await query('SELECT id FROM prediction_access_logs WHERE subject_id = ? AND match_id = ? LIMIT 1', [subjectId, matchId]);
    if (prior.length) {
      const data = await getPredictionForMatch(matchId);
      return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=120' } });
    }

    // New device same network: if any subject with same IP has an access log for this match today, allow read
    try {
      const ipGrant = await query(
        `SELECT pal.id
         FROM prediction_access_logs pal
         JOIN subject_fingerprints sf ON sf.subject_id = pal.subject_id
         WHERE pal.match_id = ?
           AND DATE(pal.accessed_at) = ?
           AND sf.ip_hash = ?
         LIMIT 1`,
        [matchId, today, ipHash]
      );
      if (ipGrant.length) {
        const data = await getPredictionForMatch(matchId);
        return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=120' } });
      }
    } catch {}

    // Check authenticated user match purchase (individual purchase)
    if (userId && await hasMatchPurchase(userId, matchId)) {
      const data = await getPredictionForMatch(matchId);
      return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
    }
    
    // Note: For subscription access, users must go through /api/predictions/access first
    // This prevents direct access and ensures proper limit tracking

    // Do NOT allow daily free directly from GET; only via /access which logs the grant for this match

    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: (e && e.message) || '' }), { status: 500 });
  }
}



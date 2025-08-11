import { getOrCreateSubject, getClientIp, getUserAgent, hashIpUa } from '../../../lib/subject.js';
import { findActiveSubscription, hasMatchPurchase } from '../../../lib/access.js';
import { query } from '../../../lib/db.js';
import { isGooglebot } from '../../../lib/bot.js';
import { getPredictionForMatch } from '../../../lib/matches.js';

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

    // Has subscription (quota might have been consumed in /access)
    const sub = await findActiveSubscription(subjectId);
    if (sub) {
      const data = await getPredictionForMatch(matchId);
      return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
    }

    // One-off purchase
    if (await hasMatchPurchase(subjectId, matchId)) {
      const data = await getPredictionForMatch(matchId);
      return new Response(JSON.stringify(data || { text: null }), { status: 200, headers: { 'Cache-Control': 'private, max-age=60' } });
    }

    // Do NOT allow daily free directly from GET; only via /access which logs the grant for this match

    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', message: (e && e.message) || '' }), { status: 500 });
  }
}



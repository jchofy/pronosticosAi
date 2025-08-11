import { getOrCreateSubject, getClientIp, getUserAgent, hashIpUa } from '../../../lib/subject.js';
import { query } from '../../../lib/db.js';

export async function GET({ request, cookies }) {
  try {
    const AstroLike = { request, cookies };
    const { subjectId } = await getOrCreateSubject(AstroLike);
    const ip = getClientIp(AstroLike);
    const ua = getUserAgent(AstroLike);
    const { ipHash } = hashIpUa(ip, ua);
    const today = new Date().toISOString().slice(0, 10);

    const dfu = await query('SELECT count FROM daily_free_uses WHERE subject_id = ? AND date_utc = ? LIMIT 1', [subjectId, today]);
    const dfuCount = dfu?.[0]?.count ? Number(dfu[0].count) : 0;
    const ipUsed = await query('SELECT id FROM daily_ipua_uses WHERE date_utc = ? AND ip_hash = ? LIMIT 1', [today, ipHash]);
    const free_remaining = (dfuCount >= 1 || ipUsed.length > 0) ? 0 : 1;

    return new Response(JSON.stringify({ free_remaining }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
  }
}



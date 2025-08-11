import { query } from './db.js';
import { hmac, uuid, signCookie, verifyCookie } from './crypto.js';

const COOKIE_NAME = 'aid';

export const getClientIp = (Astro) => {
  try {
    const h = Astro?.request?.headers;
    const forwarded = h?.get('x-forwarded-for');
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return Astro?.clientAddress || '0.0.0.0';
  } catch { return '0.0.0.0'; }
};

export const getUserAgent = (Astro) => {
  try { return Astro?.request?.headers?.get('user-agent') || ''; } catch { return ''; }
};

export const hashIpUa = (ip, ua) => ({ ipHash: hmac(ip || ''), uaHash: hmac(ua || '') });

export const getOrCreateSubject = async (Astro) => {
  const cookies = Astro.cookies;
  const signed = cookies.get(COOKIE_NAME)?.value || null;
  let anonId = verifyCookie(signed);
  let subjectId = null;
  let hasCookie = Boolean(anonId);

  if (!anonId) {
    anonId = uuid();
    hasCookie = false;
  }

  // Ensure subject exists
  const rows = await query('SELECT id FROM subjects WHERE anon_id = ? LIMIT 1', [anonId]);
  if (rows.length) {
    subjectId = rows[0].id;
    await query('UPDATE subjects SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [subjectId]);
  } else {
    const res = await query('INSERT INTO subjects (anon_id) VALUES (?)', [anonId]);
    subjectId = res.insertId;
  }

  // Set cookie if needed
  if (!hasCookie) {
    const val = signCookie(anonId);
    // Prefer secure cookies only on HTTPS
    let isSecure = true;
    try {
      const req = Astro?.request;
      const url = req ? new URL(req.url) : null;
      isSecure = url ? url.protocol === 'https:' : (process.env.NODE_ENV === 'production');
    } catch { isSecure = (process.env.NODE_ENV === 'production'); }
    cookies.set(COOKIE_NAME, val, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
      maxAge: 60 * 60 * 24 * 365, // 1y
    });
  }

  // store fingerprint
  try {
    const ip = getClientIp(Astro);
    const ua = getUserAgent(Astro);
    const { ipHash, uaHash } = hashIpUa(ip, ua);
    await query('INSERT INTO subject_fingerprints (subject_id, ip_hash, ua_hash) VALUES (?, ?, ?)', [subjectId, ipHash, uaHash]);
  } catch {}

  return { subjectId, hasCookie };
};



import { getLeagues } from '../lib/leagues.js';
import { getUpcomingMatches } from '../lib/matches.js';
import { query } from '../lib/db.js';
import { SITE_URL } from '../lib/env.js';

const xmlEscape = (s) => String(s).replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;','\'':'&apos;'}[c]));

export async function GET() {
  const site = SITE_URL;
  try {
    const leagues = await getLeagues();
    const upcoming = await getUpcomingMatches(24 * 7);
    // recent last 7 days
    const recent = await query(
      `SELECT slug, date FROM matches WHERE date BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND NOW() ORDER BY date DESC`
    );

    const urls = [];
    const add = (loc, { changefreq = 'weekly', priority = 0.5, lastmod = null } = {}) => {
      urls.push({ loc: `${site}${loc}`, changefreq, priority, lastmod });
    };

    add('/', { changefreq: 'hourly', priority: 0.7 });
    add('/resultados', { changefreq: 'daily', priority: 0.6 });
    for (const l of leagues) {
      add(`/liga/${l.slug}`, { changefreq: 'hourly', priority: 0.6 });
      add(`/clasificacion/${l.slug}`, { changefreq: 'daily', priority: 0.5 });
    }

    for (const m of upcoming) {
      add(`/partido/${m.slug}`, { changefreq: 'hourly', priority: 0.9, lastmod: new Date(m.date).toISOString() });
    }

    for (const m of recent) {
      add(`/partido/${m.slug}`, { changefreq: 'daily', priority: 0.4, lastmod: new Date(m.date).toISOString() });
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      urls.map(u => `\n  <url>\n    <loc>${xmlEscape(u.loc)}</loc>` +
        (u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '') +
        `\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('') +
      `\n</urlset>`;

    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
  } catch (e) {
    return new Response('Service unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
} 
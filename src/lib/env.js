import 'dotenv/config';
// Prefer explicit SITE_URL. If absent, use VERCEL_URL (https) in prod; fallback to localhost in dev.
const resolvedSiteUrl = (() => {
  if (process.env.SITE_URL && process.env.SITE_URL.trim()) return process.env.SITE_URL.trim();
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim()) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  return 'http://localhost:4321';
})();
export const SITE_URL = resolvedSiteUrl.replace(/\/$/, '');
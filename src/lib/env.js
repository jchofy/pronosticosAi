import 'dotenv/config';

// Stripe configuration
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const STRIPE_PRICE_MATCH = process.env.STRIPE_PRICE_MATCH;
export const STRIPE_PRICE_SUB_2DAY = process.env.STRIPE_PRICE_SUB_2DAY;
export const STRIPE_PRICE_SUB_5DAY = process.env.STRIPE_PRICE_SUB_5DAY;
export const STRIPE_PRICE_SUB_UNLIMITED = process.env.STRIPE_PRICE_SUB_UNLIMITED;

// N8N Telegram webhook URL for logging
export const URL_N8N_TELEGRAM = process.env.URL_N8N_TELEGRAM;

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
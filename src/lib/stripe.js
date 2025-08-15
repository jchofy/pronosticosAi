import 'dotenv/config';
import Stripe from 'stripe';

const { STRIPE_SECRET_KEY } = process.env;

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing in environment variables');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // Keep up-to-date with Stripe API versions
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'PronosticosAI',
    version: '1.0.0',
  },
});

// Re-export frequently used price IDs to avoid scattering string literals
export const PRICE_IDS = {
  subMonth: process.env.STRIPE_PRICE_SUB_MONTH ?? '',
  subYear: process.env.STRIPE_PRICE_SUB_YEAR ?? '',
  match: process.env.STRIPE_PRICE_MATCH ?? '',
};

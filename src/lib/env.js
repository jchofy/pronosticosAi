import 'dotenv/config';
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:4321').replace(/\/$/, ''); 
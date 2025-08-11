import crypto from 'crypto';

const COOKIE_SECRET = String(process.env.COOKIE_SIGNING_SECRET || 'dev-cookie-secret');
const APP_HMAC_SECRET = String(process.env.APP_HMAC_SECRET || 'dev-hmac-secret');

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.randomBytes(1)[0]&15>>c/4).toString(16)));

export const hmac = (input) => {
  return crypto.createHmac('sha256', APP_HMAC_SECRET).update(String(input)).digest('hex');
};

export const signCookie = (value) => {
  const sig = crypto.createHmac('sha256', COOKIE_SECRET).update(String(value)).digest('hex');
  return `${value}.${sig}`;
};

export const verifyCookie = (signed) => {
  if (!signed || typeof signed !== 'string') return null;
  const lastDot = signed.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const value = signed.slice(0, lastDot);
  const expected = signCookie(value);
  return expected === signed ? value : null;
};



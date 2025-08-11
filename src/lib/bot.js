import dns from 'dns/promises';

const isGoogleHostname = (h) => h.endsWith('.googlebot.com') || h.endsWith('.google.com');

export const isGooglebot = async (req) => {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
    if (!ip) return false;
    const hostnames = await dns.reverse(ip);
    if (!hostnames || !hostnames.length) return false;
    const hostname = hostnames[0];
    if (!isGoogleHostname(hostname)) return false;
    const forwards = await dns.lookup(hostname, { all: true });
    return forwards.some((r) => r.address === ip);
  } catch {
    return false;
  }
};



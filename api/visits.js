const ALLOWED_ORIGINS = new Set((process.env.PORTFOLIO_ALLOWED_ORIGINS || 'https://adrielmagalona.dev,https://www.adrielmagalona.dev,http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim()).filter(Boolean));
const PATH = process.env.PORTFOLIO_VISITS_FIREBASE_PATH || 'portfolioVisits/total';

function originFor(req) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin) return origin;
  try { return new URL(String(req.headers.referer || '')).origin; } catch { return ''; }
}

function clientIp(req) {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  return forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function allowIncrement(ip) {
  const store = globalThis.__portfolioVisitRateStore || (globalThis.__portfolioVisitRateStore = new Map());
  const now = Date.now();
  const previous = store.get(ip);
  if (previous && now - previous < 3_600_000) return false;
  store.set(ip, now);
  return true;
}

function firebaseUrl() {
  const base = String(process.env.FIREBASE_DATABASE_URL || '').trim().replace(/\/+$/, '');
  const secret = String(process.env.FIREBASE_DATABASE_SECRET || process.env.PORTFOLIO_FIREBASE_DATABASE_SECRET || '').trim();
  if (!base || !secret) return '';
  return `${base}/${PATH}.json?auth=${encodeURIComponent(secret)}`;
}

async function read(url) {
  const response = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
  if (!response.ok) throw new Error(`Firebase read failed (${response.status})`);
  return { count: Number(await response.json()) || 0, etag: response.headers.get('etag') || '*' };
}

async function increment(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await read(url);
    const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'if-match': current.etag }, body: JSON.stringify(current.count + 1) });
    if (response.ok) return current.count + 1;
    if (response.status !== 412) throw new Error(`Firebase write failed (${response.status})`);
  }
  throw new Error('Counter contention limit reached');
}

export default async function handler(req, res) {
  const origin = originFor(req);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS').end();
  if (!['GET', 'POST'].includes(req.method || '') || (origin && !ALLOWED_ORIGINS.has(origin))) return res.status(405).json({ error: 'Not allowed' });
  const url = firebaseUrl();
  if (!url) return res.status(503).json({ error: 'Visit counter is not configured' });
  try {
    const count = req.method === 'POST' && allowIncrement(clientIp(req)) ? await increment(url) : (await read(url)).count;
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Visit counter failed:', error?.message || error);
    return res.status(502).json({ error: 'Visit counter is temporarily unavailable' });
  }
}

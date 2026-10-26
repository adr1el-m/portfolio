/**
 * Shared request plumbing for the portfolio's Vercel Functions.
 * (Files under api/_lib are not routes: Vercel skips underscore paths.)
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://adrielmagalona.dev',
  'https://www.adrielmagalona.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

/** Comma-separated allowlist from the first env var that is set, else the defaults. */
export function allowedOrigins(...envNames) {
  for (const name of [...envNames, 'PORTFOLIO_ALLOWED_ORIGINS']) {
    const values = String(process.env[name] || '').split(',').map((v) => v.trim()).filter(Boolean);
    if (values.length) return new Set(values);
  }
  return new Set(DEFAULT_ALLOWED_ORIGINS);
}

export function requestOrigin(req) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin) return origin;
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  if (!referer) return '';
  try { return new URL(referer).origin; } catch { return ''; }
}

export function isLocalhostOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:')
      && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1');
  } catch {
    return false;
  }
}

/**
 * Applies CORS for allowlisted origins plus baseline response hardening.
 * Returns whether the caller's origin is allowed.
 */
export function prepare(req, res, {
  methods = 'POST,OPTIONS',
  headers = 'Content-Type',
  origins = allowedOrigins(),
  allowMissingOrigin = false,
  allowLocalhost = false,
  cache = 'no-store',
} = {}) {
  const origin = requestOrigin(req);
  const isAllowed = origin
    ? origins.has(origin) || (allowLocalhost && isLocalhostOrigin(origin))
    : allowMissingOrigin;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (cache) res.setHeader('Cache-Control', cache);
  if (origin && isAllowed) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', headers);
    res.setHeader('Access-Control-Max-Age', '600');
  }
  return { origin, isAllowed };
}

export function clientIp(req) {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : '';
  return real || req.socket?.remoteAddress || 'unknown';
}

/** Parsed JSON object, {} for an empty body, or null when the body is malformed. */
export function jsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string') return {};
  try {
    const parsed = JSON.parse(req.body);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Collapses whitespace (which also blocks header injection) and bounds length. */
export function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function queryParam(req, name) {
  const value = req.query?.[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] || '';
  try { return new URL(req.url || '/', 'http://localhost').searchParams.get(name) || ''; } catch { return ''; }
}

/**
 * Fixed-window limiter. Per function instance (serverless instances do not
 * share memory), so it is a burst guard, not a global quota. Old windows are
 * swept so the map cannot grow without bound on a long-lived instance.
 */
export function rateLimit(name, key, maxRequests, windowMs) {
  const storeKey = `__portfolioRateStore_${name}`;
  const store = globalThis[storeKey] || (globalThis[storeKey] = new Map());
  const now = Date.now();

  if (store.size > 5_000) {
    for (const [k, entry] of store) if (now - entry.windowStart >= windowMs) store.delete(k);
  }

  const entry = store.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000)) };
  }
  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function tooMany(res, retryAfterSec, message) {
  res.setHeader('Retry-After', String(retryAfterSec));
  res.status(429).json({ error: message });
}

/** Firebase Realtime Database REST URL for a path, or '' when not configured. */
export function firebaseUrl(path, { requireSecret = false } = {}) {
  const base = String(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').trim().replace(/\/+$/, '');
  const secret = String(process.env.FIREBASE_DATABASE_SECRET || process.env.PORTFOLIO_FIREBASE_DATABASE_SECRET || '').trim();
  if (!base || (requireSecret && !secret)) return '';
  return `${base}/${path}.json${secret ? `?auth=${encodeURIComponent(secret)}` : ''}`;
}

/**
 * Optimistic read-modify-write against Firebase using ETags, so concurrent
 * writers retry instead of silently overwriting each other.
 */
export async function firebaseTransaction(url, update, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const read = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' }, signal: AbortSignal.timeout(6_000) });
    if (!read.ok) throw new Error(`Firebase read failed (${read.status})`);
    const etag = read.headers.get('etag') || '*';
    const next = update(await read.json());
    const write = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'if-match': etag },
      body: JSON.stringify(next),
      signal: AbortSignal.timeout(6_000),
    });
    if (write.ok) return next;
    if (write.status !== 412) throw new Error(`Firebase write failed (${write.status})`);
  }
  throw new Error('Firebase contention limit reached');
}

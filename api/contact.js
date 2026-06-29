const DEFAULT_ALLOWED_ORIGINS = [
  'https://adriel.dev',
  'https://www.adriel.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function getAllowedOrigins() {
  const raw = process.env.PORTFOLIO_ALLOWED_ORIGINS || '';
  const envOrigins = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return new Set(envOrigins.length ? envOrigins : DEFAULT_ALLOWED_ORIGINS);
}

function getRequestOrigin(req) {
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (originHeader) return originHeader;
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  if (!referer) return '';
  try { return new URL(referer).origin; } catch { return ''; }
}

function setCors(req, res, methods = 'POST,OPTIONS') {
  const allowedOrigins = getAllowedOrigins();
  const origin = getRequestOrigin(req);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return { origin, isAllowed: Boolean(origin && allowedOrigins.has(origin)) };
}

function getClientIp(req) {
  const xff = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  if (xff) return xff.split(',')[0].trim();
  const xrip = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : '';
  return xrip || req.socket?.remoteAddress || 'unknown';
}

function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string') return {};
  try { return JSON.parse(req.body); } catch { return null; }
}

function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function getRateStore(name) {
  const key = `__portfolioRateStore_${name}`;
  if (!globalThis[key]) globalThis[key] = new Map();
  return globalThis[key];
}

function checkRateLimit(name, ip, maxRequests, windowMs) {
  const now = Date.now();
  const store = getRateStore(name);
  const entry = store.get(ip);
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000));
    return { allowed: false, retryAfterSec };
  }
  entry.count += 1;
  store.set(ip, entry);
  return { allowed: true, retryAfterSec: 0 };
}

const RATE_WINDOW_MS = Number(process.env.PORTFOLIO_CONTACT_RATE_WINDOW_MS || 60_000);
const RATE_MAX_REQUESTS = Number(process.env.PORTFOLIO_CONTACT_RATE_MAX_REQUESTS || 3);
const OWNER_EMAIL = process.env.PORTFOLIO_CONTACT_TO || 'dagsmagalona@gmail.com';
const FIREBASE_CONTACT_PATH = process.env.PORTFOLIO_CONTACT_FIREBASE_PATH || 'portfolioContacts';

async function sendWithResend(payload) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const from = process.env.PORTFOLIO_CONTACT_FROM || 'Portfolio <onboarding@resend.dev>';
  const subject = `Portfolio Inquiry: ${payload.reason}`;
  const text = [
    `Reason: ${payload.reason}`,
    `From: ${payload.name || 'Anonymous visitor'}`,
    `Reply-to: ${payload.email || 'Not provided'}`,
    `Page: ${payload.path || 'Unknown'}`,
    '',
    payload.message,
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: OWNER_EMAIL,
      reply_to: payload.email || undefined,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    console.error(`Resend contact error (${response.status}):`, raw.slice(0, 500));
    return { sent: false, reason: 'Email provider rejected the request' };
  }

  return { sent: true };
}

function firebaseUrl() {
  const base = (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const auth = process.env.FIREBASE_DATABASE_SECRET || process.env.PORTFOLIO_FIREBASE_DATABASE_SECRET || '';
  const suffix = auth ? `?auth=${encodeURIComponent(auth)}` : '';
  return `${base}/${FIREBASE_CONTACT_PATH}.json${suffix}`;
}

async function persistContact(payload) {
  const url = firebaseUrl();
  if (!url || typeof fetch === 'undefined') return false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        at: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      console.warn(`Contact persistence failed (${response.status}).`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Contact persistence unavailable:', error?.message || error);
    return false;
  }
}

export default async function handler(req, res) {
  const cors = setCors(req, res, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(cors.isAllowed ? 204 : 403).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  if (!cors.isAllowed) {
    res.status(403).json({ error: 'Forbidden origin.' });
    return;
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit('contact', ip, RATE_MAX_REQUESTS, RATE_WINDOW_MS);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    res.status(429).json({ error: 'Too many contact attempts. Please try again shortly.' });
    return;
  }

  const body = parseJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const payload = {
    reason: sanitizeText(body.reason, 80) || 'Project inquiry',
    name: sanitizeText(body.name, 120),
    email: sanitizeText(body.email, 180),
    message: sanitizeText(body.message, 1200),
    path: sanitizeText(body.path, 160),
  };

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  if (!payload.message || payload.message.length < 8) {
    res.status(400).json({ error: 'Please include a short message.' });
    return;
  }

  try {
    const [result, persisted] = await Promise.all([
      sendWithResend(payload),
      persistContact(payload),
    ]);
    if (!result.sent) {
      console.warn('Contact accepted but not emailed:', result.reason);
      res.status(202).json({
        ok: true,
        queued: false,
        persisted,
        email: OWNER_EMAIL,
        message: persisted
          ? 'Contact request saved. Email delivery is not configured yet.'
          : 'Contact request accepted. Email delivery is not configured yet.',
      });
      return;
    }

    res.status(202).json({ ok: true, queued: true, persisted });
  } catch (error) {
    console.error('Contact endpoint fatal error:', error);
    res.status(500).json({ error: 'Contact endpoint failed.' });
  }
}

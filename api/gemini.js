const DEFAULT_ALLOWED_ORIGINS = [
  'https://adriel.dev',
  'https://www.adriel.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);

const RATE_WINDOW_MS = Number(process.env.GEMINI_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_MAX_REQUESTS = Number(process.env.GEMINI_RATE_LIMIT_MAX_REQUESTS || 12);
const MAX_PROMPT_CHARS = Number(process.env.GEMINI_MAX_PROMPT_CHARS || 4_000);

function getAllowedOrigins() {
  const raw = process.env.GEMINI_ALLOWED_ORIGINS || '';
  const envOrigins = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return new Set(envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS);
}

function getRequestOrigin(req) {
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (originHeader) return originHeader;
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
  if (!referer) return '';
  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
}

function getClientIp(req) {
  const xff = typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : '';
  if (xff) return xff.split(',')[0].trim();
  const xrip = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : '';
  if (xrip) return xrip;
  return req.socket?.remoteAddress || 'unknown';
}

function getRateStore() {
  const g = globalThis;
  if (!g.__geminiRateStore) g.__geminiRateStore = new Map();
  return g.__geminiRateStore;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const store = getRateStore();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    store.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= RATE_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000));
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  store.set(ip, entry);
  return { allowed: true, retryAfterSec: 0 };
}

function setCors(res, origin, allowedOrigins) {
  if (!origin || !allowedOrigins.has(origin)) return;
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = getRequestOrigin(req);
  setCors(res, origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin)) {
      res.status(403).json({ error: 'Forbidden origin.' });
      return;
    }
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  if (!origin || !allowedOrigins.has(origin)) {
    res.status(403).json({ error: 'Forbidden origin.' });
    return;
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      console.error('Gemini API key missing on server.');
      res.status(500).json({
        error: 'Gemini API key not configured on server.',
        hint: 'Set GEMINI_API_KEY in Vercel Environment Variables.',
      });
      return;
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        res.status(400).json({ error: 'Invalid JSON body.' });
        return;
      }
    }

    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const model = typeof body?.model === 'string' ? body.model.trim() : defaultModel;

    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt.' });
      return;
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      res.status(413).json({ error: 'Prompt too long.' });
      return;
    }
    if (!ALLOWED_MODELS.has(model)) {
      res.status(400).json({ error: 'Unsupported model.' });
      return;
    }

    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = `${baseUrl}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    if (typeof fetch === 'undefined') {
      console.error('Global fetch not available. Node version:', process.version);
      res.status(500).json({ error: 'Server configuration error: fetch not available.' });
      return;
    }

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const raw = await upstream.text().catch(() => '');
      const snippet = raw.length > 500 ? raw.slice(0, 500) + '...' : raw;
      console.error(`Gemini upstream error (${upstream.status}):`, snippet);
      res.status(upstream.status).json({
        error: 'Upstream Gemini API error.',
        status: upstream.status,
      });
      return;
    }

    const data = await upstream.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
      : '';

    res.status(200).json({ text: text ? text.trim() : null });
  } catch (err) {
    console.error('Gemini proxy fatal error:', err);
    res.status(500).json({
      error: 'Gemini proxy internal server error.',
    });
  }
};

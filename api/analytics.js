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

function setCors(req, res, methods = 'GET,POST,OPTIONS') {
  const allowedOrigins = getAllowedOrigins();
  const origin = getRequestOrigin(req);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Portfolio-Admin-Key');
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

function getQueryParam(req, name) {
  if (req.query && typeof req.query[name] === 'string') return req.query[name];
  if (req.query && Array.isArray(req.query[name])) return req.query[name][0] || '';
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.searchParams.get(name) || '';
  } catch {
    return '';
  }
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

const EVENT_TYPES = new Set([
  'page-view',
  'project-open',
  'honor-open',
  'contact-action',
  'chatbot-question',
  'contact-submit',
]);

const MAX_EVENTS = Number(process.env.PORTFOLIO_ANALYTICS_MAX_EVENTS || 800);
const RATE_WINDOW_MS = Number(process.env.PORTFOLIO_ANALYTICS_RATE_WINDOW_MS || 60_000);
const RATE_MAX_REQUESTS = Number(process.env.PORTFOLIO_ANALYTICS_RATE_MAX_REQUESTS || 80);
const FIREBASE_PATH = process.env.PORTFOLIO_ANALYTICS_FIREBASE_PATH || 'portfolioAnalytics/summary';

function store() {
  if (!globalThis.__portfolioAnalyticsStore) {
    globalThis.__portfolioAnalyticsStore = [];
  }
  return globalThis.__portfolioAnalyticsStore;
}

function topCounts(events, type, limit = 8) {
  const counts = new Map();
  events
    .filter((event) => event.type === type)
    .forEach((event) => {
      counts.set(event.label, (counts.get(event.label) || 0) + 1);
    });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function emptyPersistentSummary() {
  return {
    totalEvents: 0,
    lastSeen: null,
    counts: {
      pageViews: {},
      projectOpens: {},
      honorOpens: {},
      contactActions: {},
      contactSubmissions: {},
    },
    recentQuestions: [],
  };
}

function incrementCount(record, label) {
  record[label] = (record[label] || 0) + 1;
}

function persistentToPublic(data) {
  const summaryData = data || emptyPersistentSummary();
  const toTop = (record) => Object.entries(record || {})
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  return {
    totalEvents: summaryData.totalEvents || 0,
    lastSeen: summaryData.lastSeen || null,
    pageViews: toTop(summaryData.counts?.pageViews),
    projectOpens: toTop(summaryData.counts?.projectOpens),
    honorOpens: toTop(summaryData.counts?.honorOpens),
    contactActions: toTop(summaryData.counts?.contactActions),
    contactSubmissions: toTop(summaryData.counts?.contactSubmissions),
    recentQuestions: Array.isArray(summaryData.recentQuestions) ? summaryData.recentQuestions.slice(-8).reverse() : [],
  };
}

function summary(events) {
  return {
    totalEvents: events.length,
    lastSeen: events.at(-1)?.at || null,
    pageViews: topCounts(events, 'page-view'),
    projectOpens: topCounts(events, 'project-open'),
    honorOpens: topCounts(events, 'honor-open'),
    contactActions: topCounts(events, 'contact-action'),
    contactSubmissions: topCounts(events, 'contact-submit'),
    recentQuestions: events
      .filter((event) => event.type === 'chatbot-question')
      .slice(-8)
      .reverse()
      .map((event) => ({ label: event.label, at: event.at })),
  };
}

function firebaseBaseUrl() {
  const url = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || '';
  return url.trim().replace(/\/+$/, '');
}

function firebaseUrl() {
  const base = firebaseBaseUrl();
  if (!base) return '';
  const auth = process.env.FIREBASE_DATABASE_SECRET || process.env.PORTFOLIO_FIREBASE_DATABASE_SECRET || '';
  const suffix = auth ? `?auth=${encodeURIComponent(auth)}` : '';
  return `${base}/${FIREBASE_PATH}.json${suffix}`;
}

async function readPersistentSummary() {
  const url = firebaseUrl();
  if (!url || typeof fetch === 'undefined') return null;
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      console.warn(`Persistent analytics read failed (${response.status}).`);
      return null;
    }
    return (await response.json()) || emptyPersistentSummary();
  } catch (error) {
    console.warn('Persistent analytics read unavailable:', error?.message || error);
    return null;
  }
}

async function writePersistentSummary(event) {
  const url = firebaseUrl();
  if (!url || typeof fetch === 'undefined') return false;

  const current = (await readPersistentSummary()) || emptyPersistentSummary();
  current.totalEvents = (current.totalEvents || 0) + 1;
  current.lastSeen = event.at;
  current.counts = current.counts || emptyPersistentSummary().counts;

  if (event.type === 'page-view') incrementCount(current.counts.pageViews, event.label);
  if (event.type === 'project-open') incrementCount(current.counts.projectOpens, event.label);
  if (event.type === 'honor-open') incrementCount(current.counts.honorOpens, event.label);
  if (event.type === 'contact-action') incrementCount(current.counts.contactActions, event.label);
  if (event.type === 'contact-submit') incrementCount(current.counts.contactSubmissions, event.label);
  if (event.type === 'chatbot-question') {
    current.recentQuestions = Array.isArray(current.recentQuestions) ? current.recentQuestions : [];
    current.recentQuestions.push({ label: event.label, at: event.at });
    current.recentQuestions = current.recentQuestions.slice(-20);
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current),
  });
  if (!response.ok) {
    console.warn(`Persistent analytics write failed (${response.status}).`);
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  const cors = setCors(req, res, 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(cors.isAllowed ? 204 : 403).end();
    return;
  }

  if (!cors.isAllowed) {
    res.status(403).json({ error: 'Forbidden origin.' });
    return;
  }

  const events = store();

  if (req.method === 'GET') {
    const isPublicSnapshot = getQueryParam(req, 'public') === '1';
    const adminKey = process.env.PORTFOLIO_ADMIN_KEY || '';
    const providedKey = typeof req.headers['x-portfolio-admin-key'] === 'string'
      ? req.headers['x-portfolio-admin-key']
      : '';
    if (!isPublicSnapshot && adminKey && providedKey !== adminKey) {
      res.status(401).json({ error: 'Missing or invalid admin key.' });
      return;
    }
    const persistent = await readPersistentSummary();
    res.status(200).json(persistent ? persistentToPublic(persistent) : summary(events));
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit('analytics', ip, RATE_MAX_REQUESTS, RATE_WINDOW_MS);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    res.status(429).json({ error: 'Too many analytics events.' });
    return;
  }

  const body = parseJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const type = sanitizeText(body.type, 60);
  const label = sanitizeText(body.label, 180);
  if (!EVENT_TYPES.has(type) || !label) {
    res.status(400).json({ error: 'Invalid analytics event.' });
    return;
  }

  const event = {
    type,
    label,
    path: sanitizeText(body.path, 160),
    at: new Date().toISOString(),
  };

  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  let persisted = false;
  try {
    persisted = await writePersistentSummary(event);
  } catch (error) {
    console.warn('Persistent analytics unavailable:', error?.message || error);
  }

  res.status(202).json({ ok: true, persisted });
}

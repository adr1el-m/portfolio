/**
 * First-party portfolio analytics: aggregate counts only, no visitor IDs.
 * Persists to Firebase when configured (conflict-safe via ETags), else keeps
 * a bounded in-memory window per function instance.
 */
import crypto from 'node:crypto';
import { cleanText, clientIp, firebaseTransaction, firebaseUrl, jsonBody, prepare, queryParam, rateLimit, tooMany } from './_lib/http.js';

/** Constant-time comparison so the admin key can't be guessed by timing. */
function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
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
const MAX_STORED_QUESTIONS = 200;

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
    chatbotQuestions: [],
  };
}

function incrementCount(record, label) {
  record[label] = (record[label] || 0) + 1;
}

function persistentToPublic(data, includePrivate = false) {
  const summaryData = data || emptyPersistentSummary();
  const toTop = (record) => Object.entries(record || {})
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
  const allQuestions = Array.isArray(summaryData.chatbotQuestions)
    ? summaryData.chatbotQuestions
    : Array.isArray(summaryData.recentQuestions)
      ? summaryData.recentQuestions
      : [];

  const publicSummary = {
    totalEvents: summaryData.totalEvents || 0,
    lastSeen: summaryData.lastSeen || null,
    pageViews: toTop(summaryData.counts?.pageViews),
    projectOpens: toTop(summaryData.counts?.projectOpens),
    honorOpens: toTop(summaryData.counts?.honorOpens),
    contactActions: toTop(summaryData.counts?.contactActions),
    contactSubmissions: toTop(summaryData.counts?.contactSubmissions),
  };

  if (includePrivate) {
    publicSummary.chatbotQuestions = allQuestions;
  }

  return publicSummary;
}

function summary(events, includePrivate = false) {
  const chatbotQuestions = events
    .filter((event) => event.type === 'chatbot-question')
    .map((event) => ({ label: event.label, at: event.at }));
  const publicSummary = {
    totalEvents: events.length,
    lastSeen: events.at(-1)?.at || null,
    pageViews: topCounts(events, 'page-view'),
    projectOpens: topCounts(events, 'project-open'),
    honorOpens: topCounts(events, 'honor-open'),
    contactActions: topCounts(events, 'contact-action'),
    contactSubmissions: topCounts(events, 'contact-submit'),
  };

  if (includePrivate) {
    publicSummary.chatbotQuestions = chatbotQuestions;
  }

  return publicSummary;
}

async function readPersistentSummary() {
  const url = firebaseUrl(FIREBASE_PATH);
  if (!url) return null;
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(6_000) });
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

function applyEvent(data, event) {
  const current = data && typeof data === 'object' ? data : emptyPersistentSummary();
  current.totalEvents = (current.totalEvents || 0) + 1;
  current.lastSeen = event.at;
  current.counts = { ...emptyPersistentSummary().counts, ...(current.counts || {}) };

  if (event.type === 'page-view') incrementCount(current.counts.pageViews, event.label);
  if (event.type === 'project-open') incrementCount(current.counts.projectOpens, event.label);
  if (event.type === 'honor-open') incrementCount(current.counts.honorOpens, event.label);
  if (event.type === 'contact-action') incrementCount(current.counts.contactActions, event.label);
  if (event.type === 'contact-submit') incrementCount(current.counts.contactSubmissions, event.label);
  if (event.type === 'chatbot-question') {
    const previous = Array.isArray(current.chatbotQuestions)
      ? current.chatbotQuestions
      : Array.isArray(current.recentQuestions) ? current.recentQuestions : [];
    // Bounded: an ever-growing array would make every event slower to write.
    current.chatbotQuestions = [...previous, { label: event.label, at: event.at }].slice(-MAX_STORED_QUESTIONS);
    current.recentQuestions = current.chatbotQuestions.slice(-20);
  }
  return current;
}

async function writePersistentSummary(event) {
  const url = firebaseUrl(FIREBASE_PATH);
  if (!url) return false;
  await firebaseTransaction(url, (data) => applyEvent(data, event));
  return true;
}

export default async function handler(req, res) {
  const cors = prepare(req, res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type, X-Portfolio-Admin-Key' });

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
    const isPublicSnapshot = queryParam(req, 'public') === '1';
    const adminKey = process.env.PORTFOLIO_ADMIN_KEY || '';
    const providedKey = typeof req.headers['x-portfolio-admin-key'] === 'string'
      ? req.headers['x-portfolio-admin-key']
      : '';
    if (!isPublicSnapshot && (!adminKey || !safeEqual(providedKey, adminKey))) {
      res.status(401).json({ error: 'Missing or invalid admin key.' });
      return;
    }
    const persistent = await readPersistentSummary();
    res.status(200).json(persistent ? persistentToPublic(persistent, !isPublicSnapshot) : summary(events, !isPublicSnapshot));
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const rate = rateLimit('analytics', clientIp(req), RATE_MAX_REQUESTS, RATE_WINDOW_MS);
  if (!rate.allowed) {
    tooMany(res, rate.retryAfterSec, 'Too many analytics events.');
    return;
  }

  const body = jsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const type = cleanText(body.type, 60);
  const label = cleanText(body.label, 180);
  if (!EVENT_TYPES.has(type) || !label) {
    res.status(400).json({ error: 'Invalid analytics event.' });
    return;
  }

  const event = {
    type,
    label,
    path: cleanText(body.path, 160),
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

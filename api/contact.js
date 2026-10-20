/**
 * Contact delivery via Resend, with an optional Firebase copy.
 *
 * Spam defenses: a hidden honeypot field and a minimum fill-in time. Both
 * are answered with an ordinary-looking 202 so bots learn nothing; humans
 * never see either.
 */
import { cleanText, clientIp, firebaseUrl, jsonBody, prepare, rateLimit, tooMany } from './_lib/http.js';

const RATE_WINDOW_MS = Number(process.env.PORTFOLIO_CONTACT_RATE_WINDOW_MS || 60_000);
const RATE_MAX_REQUESTS = Number(process.env.PORTFOLIO_CONTACT_RATE_MAX_REQUESTS || 3);
const OWNER_EMAIL = process.env.PORTFOLIO_CONTACT_TO || 'dagsmagalona@gmail.com';
const FIREBASE_CONTACT_PATH = process.env.PORTFOLIO_CONTACT_FIREBASE_PATH || 'portfolioContacts';
const MIN_FILL_MS = 2_500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendWithResend(payload) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.PORTFOLIO_CONTACT_FROM || 'Portfolio <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      reply_to: payload.email || undefined,
      subject: `Portfolio Inquiry: ${payload.reason}`,
      text: [
        `Reason: ${payload.reason}`,
        `From: ${payload.name || 'Anonymous visitor'}`,
        `Reply-to: ${payload.email || 'Not provided'}`,
        `Page: ${payload.path || 'Unknown'}`,
        '',
        payload.message,
      ].join('\n'),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    console.error(`Resend contact error (${response.status}):`, raw.slice(0, 500));
    return { sent: false, reason: 'Email provider rejected the request' };
  }
  return { sent: true };
}

async function persistContact(payload) {
  const url = firebaseUrl(FIREBASE_CONTACT_PATH);
  if (!url) return false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, at: new Date().toISOString() }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) console.warn(`Contact persistence failed (${response.status}).`);
    return response.ok;
  } catch (error) {
    console.warn('Contact persistence unavailable:', error?.message || error);
    return false;
  }
}

/** True when the submission carries a bot signature. */
function looksAutomated(body) {
  if (cleanText(body.website, 200)) return true; // honeypot: invisible to humans
  const elapsed = Number(body.elapsedMs);
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS;
}

export default async function handler(req, res) {
  const { isAllowed } = prepare(req, res);

  if (req.method === 'OPTIONS') {
    res.status(isAllowed ? 204 : 403).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  if (!isAllowed) {
    res.status(403).json({ error: 'Forbidden origin.' });
    return;
  }

  const rate = rateLimit('contact', clientIp(req), RATE_MAX_REQUESTS, RATE_WINDOW_MS);
  if (!rate.allowed) {
    tooMany(res, rate.retryAfterSec, 'Too many contact attempts. Please try again shortly.');
    return;
  }

  const body = jsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const payload = {
    reason: cleanText(body.reason, 80) || 'Project inquiry',
    name: cleanText(body.name, 120),
    email: cleanText(body.email, 180),
    message: cleanText(body.message, 1200),
    path: cleanText(body.path, 160),
  };

  if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (!payload.message || payload.message.length < 8) {
    res.status(400).json({ error: 'Please include a short message.' });
    return;
  }

  if (looksAutomated(body)) {
    console.warn('Contact submission dropped as automated.');
    res.status(202).json({ ok: true, delivered: true, persisted: false });
    return;
  }

  try {
    const [result, persisted] = await Promise.all([sendWithResend(payload), persistContact(payload)]);
    if (!result.sent) {
      // A stored copy is not a delivered message; the client offers mailto instead.
      console.warn('Contact email was not delivered:', result.reason);
      res.status(503).json({
        ok: false,
        delivered: false,
        persisted,
        error: 'Message delivery is unavailable. Please use the email draft instead.',
      });
      return;
    }
    res.status(202).json({ ok: true, delivered: true, persisted });
  } catch (error) {
    console.error('Contact endpoint fatal error:', error);
    res.status(500).json({ error: 'Contact endpoint failed.' });
  }
}

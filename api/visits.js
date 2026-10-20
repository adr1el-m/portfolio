/**
 * Total-visits counter. GET reads; POST increments at most once per IP per
 * hour (per instance). Writes are conflict-safe via Firebase ETags.
 */
import { allowedOrigins, clientIp, firebaseTransaction, firebaseUrl, prepare } from './_lib/http.js';

const PATH = process.env.PORTFOLIO_VISITS_FIREBASE_PATH || 'portfolioVisits/total';
const REPEAT_WINDOW_MS = 3_600_000;

function allowIncrement(ip) {
  const store = globalThis.__portfolioVisitRateStore || (globalThis.__portfolioVisitRateStore = new Map());
  const now = Date.now();
  if (store.size > 5_000) {
    for (const [key, at] of store) if (now - at >= REPEAT_WINDOW_MS) store.delete(key);
  }
  const previous = store.get(ip);
  if (previous && now - previous < REPEAT_WINDOW_MS) return false;
  store.set(ip, now);
  return true;
}

async function readCount(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`Firebase read failed (${response.status})`);
  return Number(await response.json()) || 0;
}

export default async function handler(req, res) {
  // Same-origin page loads may omit Origin on GET; cross-origin callers must be allowlisted.
  const { isAllowed } = prepare(req, res, { methods: 'GET,POST,OPTIONS', origins: allowedOrigins(), allowMissingOrigin: true });

  if (req.method === 'OPTIONS') {
    res.status(isAllowed ? 204 : 403).end();
    return;
  }
  if (!['GET', 'POST'].includes(req.method || '') || !isAllowed) {
    res.status(405).json({ error: 'Not allowed' });
    return;
  }

  const url = firebaseUrl(PATH, { requireSecret: true });
  if (!url) {
    res.status(503).json({ error: 'Visit counter is not configured' });
    return;
  }

  try {
    const count = req.method === 'POST' && allowIncrement(clientIp(req))
      ? await firebaseTransaction(url, (current) => (Number(current) || 0) + 1)
      : await readCount(url);
    res.status(200).json({ count });
  } catch (error) {
    console.error('Visit counter failed:', error?.message || error);
    res.status(502).json({ error: 'Visit counter is temporarily unavailable' });
  }
}

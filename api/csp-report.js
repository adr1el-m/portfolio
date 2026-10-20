/**
 * CSP violation report receiver. Accepts legacy report-uri payloads
 * (application/csp-report) and Reporting API batches. Logs a compact,
 * bounded summary; anything larger is noise or abuse.
 */
import { clientIp, jsonBody, rateLimit } from './_lib/http.js';

const MAX_REPORTS_PER_MINUTE = 30;

function summarize(report) {
  const body = report?.body || report?.['csp-report'] || report || {};
  const pick = (...keys) => keys.map((k) => body[k]).find((v) => typeof v === 'string') || '';
  return {
    directive: pick('effectiveDirective', 'effective-directive', 'violated-directive').slice(0, 80),
    blocked: pick('blockedURL', 'blocked-uri').slice(0, 200),
    page: pick('documentURL', 'document-uri').slice(0, 200),
    source: pick('sourceFile', 'source-file').slice(0, 200),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  if (!rateLimit('csp', clientIp(req), MAX_REPORTS_PER_MINUTE, 60_000).allowed) {
    res.status(204).end();
    return;
  }
  const body = jsonBody(req);
  const reports = Array.isArray(body) ? body.slice(0, 10) : body ? [body] : [];
  reports.forEach((report) => console.log('[CSP] violation', summarize(report)));
  res.status(204).end();
}

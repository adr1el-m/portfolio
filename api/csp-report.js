/**
 * CSP violation report receiver for Vercel.
 * Accepts both legacy report-uri payloads (application/csp-report)
 * and Reporting API payloads (application/report or application/json).
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const contentType = req.headers['content-type'] || '';
  let body = req.body;

  try {
    // If body is a raw string, try to parse as JSON
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    // Normalize legacy CSP reports into a common shape
    const report = body && (body['csp-report'] || body);

    console.log('[CSP] Violation Report:', {
      contentType,
      report
    });
  } catch (err) {
    console.error('[CSP] Error handling report:', err);
  }

  // No content response is standard for report endpoints
  res.status(204).end();
};
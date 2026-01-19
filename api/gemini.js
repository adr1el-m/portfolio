module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    res.status(500).json({
      error: 'Gemini API key not configured on server.',
      hint: 'Set GEMINI_API_KEY (recommended) or GOOGLE_API_KEY in Vercel Environment Variables.',
    });
    return;
  }

  const contentType = req.headers['content-type'] || '';
  let body = req.body;
  try {
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
  } catch {}

  const prompt = body && typeof body.prompt === 'string' ? body.prompt : '';
  const model = body && typeof body.model === 'string' ? body.model : defaultModel;

  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt.' });
    return;
  }

  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  try {
    const upstream = await fetch(`${baseUrl}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      const snippet = raw.length > 800 ? raw.slice(0, 800) + '…' : raw;
      res.status(upstream.status).json({ error: snippet, contentType });
      return;
    }

    const data = await upstream.json().catch(() => null);
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
      : '';

    res.status(200).json({ text: text && text.trim() ? text : null });
  } catch (err) {
    res.status(500).json({ error: 'Gemini proxy request failed.' });
  }
};

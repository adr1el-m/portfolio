module.exports = async (req, res) => {
  // CORS headers for direct function calls if needed (though vercel.json usually handles this)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';
    
    const defaultModel = process.env.GEMINI_MODEL ||
      process.env.VITE_GEMINI_MODEL ||
      'gemini-2.5-flash';

    if (!apiKey) {
      console.error('Gemini API key missing on server.');
      res.status(500).json({
        error: 'Gemini API key not configured on server.',
        hint: 'Set GEMINI_API_KEY in Vercel Environment Variables.',
      });
      return;
    }

    let body = req.body;
    // Robust body parsing
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    }

    const prompt = body?.prompt || '';
    const model = body?.model || defaultModel;

    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt.' });
      return;
    }

    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = `${baseUrl}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    if (typeof fetch === 'undefined') {
      console.error('Global fetch not available. Node version:', process.version);
      res.status(500).json({ error: 'Server configuration error: fetch not available' });
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
      const snippet = raw.length > 1000 ? raw.slice(0, 1000) + '…' : raw;
      console.error(`Gemini Upstream Error (${upstream.status}):`, snippet);
      
      // Forward the upstream status code, but ensure we return JSON
      res.status(upstream.status).json({ 
        error: 'Upstream Gemini API Error', 
        status: upstream.status,
        details: snippet 
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
    console.error('Gemini Proxy Fatal Error:', err);
    res.status(500).json({
      error: 'Gemini proxy internal server error.',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

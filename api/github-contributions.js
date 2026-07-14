const DEFAULT_ALLOWED_ORIGINS = [
  'https://adrielmagalona.dev',
  'https://www.adrielmagalona.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

const GITHUB_USERNAME = 'adr1el-m';
const CACHE_SECONDS = 60 * 30;

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

function isLocalhostOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:')
      && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1');
  } catch {
    return false;
  }
}

function setCors(req, res) {
  const allowedOrigins = getAllowedOrigins();
  const origin = getRequestOrigin(req);
  const isAllowed = !origin || allowedOrigins.has(origin) || isLocalhostOrigin(origin);
  if (origin && isAllowed) {
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return { origin, isAllowed };
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function parseContributionCount(label) {
  if (/^No contributions/i.test(label)) return 0;
  const match = label.match(/^([\d,]+)\s+contribution/i);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function parseGitHubContributions(html) {
  const totalMatch = html.match(/<h2[^>]*id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s+contributions\s+in the last year/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;
  const days = [];
  const dayPattern = /<td\b[^>]*class="[^"]*\bContributionCalendar-day\b[^"]*"[^>]*><\/td>\s*<tool-tip\b[^>]*>(.*?)<\/tool-tip>/gis;
  let match;

  while ((match = dayPattern.exec(html)) !== null) {
    const tag = match[0];
    const date = readAttribute(tag, 'data-date');
    const level = Number(readAttribute(tag, 'data-level'));
    const label = decodeHtml(match[1].replace(/<[^>]+>/g, '').trim());
    if (!date) continue;
    days.push({
      date,
      count: parseContributionCount(label),
      level: Number.isFinite(level) ? Math.max(0, Math.min(4, level)) : 0,
      label,
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    username: GITHUB_USERNAME,
    total,
    summary: `${total.toLocaleString('en-US')} contributions in the last year`,
    days,
    fetchedAt: new Date().toISOString(),
    source: `https://github.com/users/${GITHUB_USERNAME}/contributions`,
  };
}

export default async function handler(req, res) {
  const cors = setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(cors.isAllowed ? 204 : 403).end();
    return;
  }

  if (!cors.isAllowed) {
    res.status(403).json({ error: 'Forbidden origin.' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const response = await fetch(`https://github.com/users/${GITHUB_USERNAME}/contributions`, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'www.adrielmagalona.dev portfolio contribution widget',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'GitHub contribution data unavailable.' });
      return;
    }

    const html = await response.text();
    const payload = parseGitHubContributions(html);

    if (!payload.days.length || !payload.total) {
      res.status(502).json({ error: 'GitHub contribution data could not be parsed.' });
      return;
    }

    res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('GitHub contribution fetch failed:', error?.message || error);
    res.status(500).json({ error: 'GitHub contribution data unavailable.' });
  }
}

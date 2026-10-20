/**
 * GitHub contribution calendar, scraped from the public profile endpoint and
 * cached at the edge for six hours.
 */
import { prepare } from './_lib/http.js';

const GITHUB_USERNAME = 'adr1el-m';
const CACHE_SECONDS = 21_600;

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
  const cors = prepare(req, res, { methods: 'GET,OPTIONS', allowMissingOrigin: true, allowLocalhost: true, cache: '' });

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
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'GitHub contribution data unavailable.' });
      return;
    }

    const html = await response.text();
    const payload = parseGitHubContributions(html);

    if (!payload.days.length || !payload.total) {
      res.status(502).json({ error: 'GitHub contribution data could not be parsed.' });
      return;
    }

    res.setHeader('Cache-Control', `public, max-age=300, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`);
    res.status(200).json(payload);
  } catch (error) {
    console.error('GitHub contribution fetch failed:', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'GitHub contribution data unavailable.' });
  }
}

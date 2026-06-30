import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GITHUB_USERNAME = 'adr1el-m';
const OUT_FILE = path.join(process.cwd(), 'public', 'data', 'github-contributions.json');

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

const response = await fetch(`https://github.com/users/${GITHUB_USERNAME}/contributions`, {
  headers: {
    Accept: 'text/html',
    'User-Agent': 'adriel.dev portfolio contribution snapshot',
  },
});

if (!response.ok) {
  throw new Error(`GitHub returned ${response.status}`);
}

const payload = parseGitHubContributions(await response.text());
if (!payload.days.length || !payload.total) {
  throw new Error('GitHub contribution data could not be parsed.');
}

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${payload.days.length} contribution days to ${OUT_FILE}`);

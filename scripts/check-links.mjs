import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkExternal = process.argv.includes('--external') || process.env.CHECK_EXTERNAL_LINKS === '1';
const sourceFiles = [
  'index.html',
  'src/data/knowledge-base.ts',
  'src/modules/structured-data.ts',
  'public/manifest.json',
  'vercel.json',
];

const ignorePrefixes = ['data:', 'blob:', 'javascript:', '#'];
const allowedRoutes = new Set(['/', '/about', '/background', '/projects', '/gear', '/contact']);

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function collectLinks() {
  const links = new Map();
  const pattern = /(?:href|src|poster|content|data-[a-z-]+)\s*=\s*["']([^"']+)["']|["'`](https?:\/\/[^"'`\s<>)]+|mailto:[^"'`\s<>)]+|tel:[^"'`\s<>)]+|\/[^"'`\s<>)]+)["'`]/gi;

  sourceFiles
    .filter((file) => fs.existsSync(path.join(root, file)))
    .forEach((file) => {
      const text = read(file);
      for (const match of text.matchAll(pattern)) {
        const raw = (match[1] || match[2] || '').trim().replace(/[),.;]+$/, '');
        if (!raw || ignorePrefixes.some((prefix) => raw.startsWith(prefix))) continue;
        if (raw.startsWith('{{') || raw.includes('${')) continue;
        const key = raw.replace(/&amp;/g, '&');
        const refs = links.get(key) || [];
        refs.push(file);
        links.set(key, refs);
      }
    });

  return links;
}

function isExternal(link) {
  return /^https?:\/\//i.test(link);
}

function isMailOrTel(link) {
  return /^(mailto|tel):/i.test(link);
}

function publicPathExists(urlPath) {
  const clean = urlPath.split('#')[0].split('?')[0];
  if (!clean || allowedRoutes.has(clean) || clean.startsWith('/honors/')) return true;
  if (clean.startsWith('/api/')) {
    const apiName = clean.replace(/^\/api\//, '');
    return ['.ts', '.js', '.mjs'].some((ext) => fs.existsSync(path.join(root, 'api', `${apiName}${ext}`)));
  }
  return fs.existsSync(path.join(root, 'public', clean.replace(/^\/+/, '')))
    || fs.existsSync(path.join(root, clean.replace(/^\/+/, '')));
}

async function checkRemote(link) {
  const headers = { 'user-agent': 'portfolio-link-check/1.0' };
  const options = { method: 'HEAD', headers, signal: AbortSignal.timeout(9000), redirect: 'follow' };

  try {
    let response = await fetch(link, options);
    if (response.status === 405) {
      response = await fetch(link, { ...options, method: 'GET' });
    }
    return response.status < 400 || [401, 403, 429].includes(response.status);
  } catch {
    try {
      const response = await fetch(link, { ...options, method: 'GET' });
      return response.status < 400 || [401, 403, 429].includes(response.status);
    } catch {
      return false;
    }
  }
}

const links = collectLinks();
const failures = [];
let skippedExternal = 0;

for (const [link, refs] of links.entries()) {
  if (isMailOrTel(link)) continue;

  if (isExternal(link)) {
    if (!checkExternal) {
      skippedExternal += 1;
      continue;
    }
    const ok = await checkRemote(link);
    if (!ok) failures.push({ link, refs, reason: 'unreachable remote URL' });
    continue;
  }

  if (link.startsWith('/')) {
    if (!publicPathExists(link)) failures.push({ link, refs, reason: 'missing local asset or route' });
  }
}

if (failures.length) {
  console.error(`Link check failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => {
    console.error(`- ${failure.link} (${failure.reason})`);
    console.error(`  referenced in: ${Array.from(new Set(failure.refs)).join(', ')}`);
  });
  process.exit(1);
}

console.log(`Link check passed for ${links.size} collected link(s).`);
if (!checkExternal && skippedExternal) {
  console.log(`Skipped ${skippedExternal} external link(s). Run with --external for a network audit.`);
}

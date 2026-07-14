import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const siteUrl = 'https://www.adrielmagalona.dev';
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function decode(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&[a-z]+;/gi, ' ');
}

function cleanText(value = '') {
  return decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function attribute(markup, name) {
  const match = markup.match(new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? decode(match[2]) : '';
}

function parseImages(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const years = [];
for (const match of source.matchAll(/<span class="year-title">(20\d{2})<\/span>/g)) {
  years.push({ index: match.index ?? 0, year: match[1] });
}

const honors = [];
for (const match of source.matchAll(/<li class="achievement-card"([\s\S]*?)<\/li>/g)) {
  const markup = match[0];
  const titleMatch = markup.match(/<h4 class="h4 card-title">([\s\S]*?)<\/h4>/i);
  const title = cleanText(titleMatch?.[1] || '');
  if (!title) continue;
  const year = [...years].reverse().find((item) => item.index < (match.index ?? 0))?.year || 'honor';
  const images = parseImages(attribute(markup, 'data-images'));
  const optimizedImages = parseImages(attribute(markup, 'data-webp-images'));
  const pathName = `/honors/${year}/${slugify(title)}`;
  honors.push({
    title,
    year,
    pathName,
    organizer: cleanText(attribute(markup, 'data-organizer')),
    date: cleanText(attribute(markup, 'data-date')),
    location: cleanText(attribute(markup, 'data-location')),
    description: cleanText(attribute(markup, 'data-description')),
    images: optimizedImages.length ? optimizedImages : images,
    links: [
      ['Repository', attribute(markup, 'data-github')],
      ['Live proof', attribute(markup, 'data-live')],
      ['LinkedIn post', attribute(markup, 'data-linkedin')],
      ['Facebook post', attribute(markup, 'data-facebook')],
      ['Article', attribute(markup, 'data-blog')],
    ].filter(([, href]) => /^https:\/\//i.test(href)),
  });
}

const projects = [];
for (const match of source.matchAll(/<li class="project-item[\s\S]*?<\/li>/g)) {
  const markup = match[0];
  const title = cleanText(markup.match(/<h3 class="project-title">([\s\S]*?)<\/h3>/i)?.[1] || '');
  if (!title) continue;
  const images = parseImages(attribute(markup, 'data-webp-images'));
  const fallbackImages = parseImages(attribute(markup, 'data-images'));
  projects.push({
    title,
    category: cleanText(attribute(markup, 'data-category')),
    description: cleanText(attribute(markup, 'data-description')),
    technologies: attribute(markup, 'data-technologies').split('•').map(cleanText).filter(Boolean),
    image: (images.length ? images : fallbackImages)[0] || '',
    codeRepository: attribute(markup, 'data-github'),
    url: attribute(markup, 'data-live') || attribute(markup, 'data-github') || siteUrl,
  });
}

function absoluteUrl(value) {
  return /^https?:\/\//i.test(value) ? value : `${siteUrl}${value}`;
}

function writePortfolioSchema() {
  const graph = [
    {
      '@type': 'Person', '@id': `${siteUrl}/#person`, name: 'Adriel Magalona', url: siteUrl,
      image: `${siteUrl}/images/my-avatar.avif`, jobTitle: 'Full-stack Developer and AI Builder',
      sameAs: ['https://github.com/adr1el-m', 'https://linkedin.com/in/adrielmagalona'],
    },
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: 'Adriel Magalona Portfolio', url: siteUrl, publisher: { '@id': `${siteUrl}/#person` } },
    {
      '@type': 'ItemList', name: 'Portfolio projects', numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({ '@type': 'ListItem', position: index + 1, item: {
        '@type': 'SoftwareSourceCode', name: project.title, url: absoluteUrl(project.url), description: project.description || undefined,
        programmingLanguage: project.technologies.length ? project.technologies : undefined,
        codeRepository: /^https:\/\//.test(project.codeRepository) ? project.codeRepository : undefined,
        image: project.image ? absoluteUrl(project.image) : undefined,
      } })),
    },
    {
      '@type': 'ItemList', name: 'Portfolio honors', numberOfItems: honors.length,
      itemListElement: honors.map((honor, index) => ({ '@type': 'ListItem', position: index + 1, item: {
        '@type': 'CreativeWork', name: honor.title, url: `${siteUrl}${honor.pathName}`, description: honor.description || undefined,
        dateCreated: honor.date || undefined, image: honor.images[0] ? absoluteUrl(honor.images[0]) : undefined,
        publisher: honor.organizer ? { '@type': 'Organization', name: honor.organizer } : undefined,
      } })),
    },
  ];
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  const file = path.join(dist, 'index.html');
  const page = fs.readFileSync(file, 'utf8');
  const placeholder = '<script id="portfolio-schema" type="application/ld+json">{}</script>';
  if (!page.includes(placeholder)) throw new Error('Portfolio schema placeholder is missing.');
  fs.writeFileSync(file, page.replace(placeholder, `<script id="portfolio-schema" type="application/ld+json">${schema}</script>`));
}

function detailPage(honor) {
  const canonical = `${siteUrl}${honor.pathName}`;
  const description = honor.description || `${honor.title} — ${honor.organizer || 'portfolio honor'}.`;
  const image = honor.images[0] ? `${siteUrl}${honor.images[0]}` : `${siteUrl}/images/my-avatar.avif`;
  const gallery = honor.images.length
    ? `<div class="gallery">${honor.images.map((src, index) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(`${honor.title} evidence ${index + 1}`)}" loading="${index ? 'lazy' : 'eager'}">`).join('')}</div>`
    : '';
  const links = honor.links.length
    ? `<nav class="links" aria-label="External evidence">${honor.links.map(([label, href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join('')}</nav>`
    : '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: honor.title,
    url: canonical,
    description,
    image,
    dateCreated: honor.date,
    locationCreated: honor.location,
    contributor: { '@type': 'Person', name: 'Adriel Magalona', url: siteUrl },
    publisher: honor.organizer ? { '@type': 'Organization', name: honor.organizer } : undefined,
  };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(honor.title)} | Adriel Magalona</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}">
<meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${escapeHtml(honor.title)} | Adriel Magalona"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<style>:root{color-scheme:dark}body{margin:0;background:#111;color:#eee;font:16px/1.6 system-ui,sans-serif}.page{width:min(900px,calc(100% - 32px));margin:auto;padding:48px 0 80px}.back{color:#ffdb70;text-decoration:none;font-weight:700}.eyebrow{margin:42px 0 8px;color:#ffdb70;font-size:.75rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}h1{max-width:780px;font-size:clamp(2rem,6vw,4.25rem);line-height:1.04;margin:0 0 24px}.facts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px}.facts span{padding:7px 10px;border:1px solid #3b3a35;border-radius:8px;background:#1a1a1a}.record{padding:22px;border:1px solid #3b3a35;border-radius:14px;background:#171717}.record h2{margin-top:0;color:#ffdb70;font-size:1rem}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:24px}.gallery img{width:100%;height:260px;object-fit:contain;background:#080808;border-radius:12px}.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.links a{padding:9px 12px;color:#111;background:#ffdb70;border-radius:8px;text-decoration:none;font-weight:800}</style></head>
<body><main class="page"><a class="back" href="/about">← Back to portfolio</a><p class="eyebrow">Achievement evidence · ${escapeHtml(honor.year)}</p><h1>${escapeHtml(honor.title)}</h1><div class="facts">${honor.organizer ? `<span>${escapeHtml(honor.organizer)}</span>` : ''}${honor.date ? `<span>${escapeHtml(honor.date)}</span>` : ''}${honor.location ? `<span>${escapeHtml(honor.location)}</span>` : ''}</div><article class="record"><h2>Portfolio record</h2><p>${escapeHtml(description)}</p>${gallery}${links}</article></main></body></html>`;
}

for (const honor of honors) {
  const directory = path.join(dist, honor.pathName);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), detailPage(honor));
}

writePortfolioSchema();

const date = new Date().toISOString().slice(0, 10);
const urls = [
  ['', '1.0'], ['/about', '0.8'], ['/background', '0.7'], ['/projects', '0.9'], ['/contact', '0.6'], ['/gear', '0.6'],
  ...honors.map((honor) => [honor.pathName, '0.7']),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([pathName, priority]) => `  <url><loc>${siteUrl}${pathName || '/'}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);
console.log(`Generated one portfolio schema graph, ${honors.length} static honor detail pages, and sitemap entries.`);

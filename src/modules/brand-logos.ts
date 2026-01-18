/**
 * Brand Logos (inline SVG)
 * Lightweight, dependency-free brand marks for common tech stack items.
 * Returns sized SVG elements suitable for the `.stack-icon` container.
 */

const NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el as SVGElementTagNameMap[K];
}

function baseSvg(): SVGSVGElement {
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    width: '22',
    height: '22',
    role: 'img',
    'aria-hidden': 'true',
    focusable: 'false',
    xmlns: NS,
  });
  return svg;
}

function reactLogo(): SVGSVGElement {
  const svg = baseSvg();
  const color = '#61DAFB';
  const ring1 = svgEl('ellipse', { cx: 12, cy: 12, rx: 5.6, ry: 10.6, fill: 'none', stroke: color, 'stroke-width': 2 });
  const ring2 = svgEl('ellipse', { cx: 12, cy: 12, rx: 5.6, ry: 10.6, fill: 'none', stroke: color, 'stroke-width': 2, transform: 'rotate(60 12 12)' });
  const ring3 = svgEl('ellipse', { cx: 12, cy: 12, rx: 5.6, ry: 10.6, fill: 'none', stroke: color, 'stroke-width': 2, transform: 'rotate(-60 12 12)' });
  const dot = svgEl('circle', { cx: 12, cy: 12, r: 2.3, fill: color });
  svg.append(ring1, ring2, ring3, dot);
  return svg;
}

function angularLogo(): SVGSVGElement {
  const svg = baseSvg();
  const shield = svgEl('polygon', {
    points: '12,2 21,8 18,21 6,21 3,8',
    fill: '#DD0031'
  });
  const a = svgEl('polygon', {
    points: '12,6.5 16.5,16.5 7.5,16.5',
    fill: '#FFFFFF'
  });
  const bar = svgEl('rect', { x: 10.4, y: 13, width: 3.2, height: 1.7, fill: '#DD0031' });
  svg.append(shield, a, bar);
  return svg;
}

function nodeLogo(): SVGSVGElement {
  const svg = baseSvg();
  const hex = svgEl('polygon', {
    points: '6,4 18,4 22,12 18,20 6,20 2,12',
    fill: '#339933'
  });
  const n = svgEl('text', { x: 12, y: 14, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': '700', fill: '#FFFFFF' });
  n.textContent = 'N';
  svg.append(hex, n);
  return svg;
}

function typescriptLogo(): SVGSVGElement {
  const svg = baseSvg();
  const rect = svgEl('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2.5, fill: '#3178C6' });
  const text = svgEl('text', { x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': '700', fill: '#FFFFFF' });
  text.textContent = 'TS';
  svg.append(rect, text);
  return svg;
}

function javascriptLogo(): SVGSVGElement {
  const svg = baseSvg();
  const rect = svgEl('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2.5, fill: '#F7DF1E' });
  const text = svgEl('text', { x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': '800', fill: '#111111' });
  text.textContent = 'JS';
  svg.append(rect, text);
  return svg;
}

function htmlLogo(): SVGSVGElement {
  const svg = baseSvg();
  const rect = svgEl('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2.5, fill: '#E34F26' });
  const text = svgEl('text', { x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': '800', fill: '#FFFFFF' });
  text.textContent = 'HTML';
  svg.append(rect, text);
  return svg;
}

function cssLogo(): SVGSVGElement {
  const svg = baseSvg();
  const rect = svgEl('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2.5, fill: '#1572B6' });
  const text = svgEl('text', { x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': '800', fill: '#FFFFFF' });
  text.textContent = 'CSS';
  svg.append(rect, text);
  return svg;
}

function tailwindLogo(): SVGSVGElement {
  const svg = baseSvg();
  const path = svgEl('path', {
    d: 'M3 12c2-6 8-6 10-3 1.8 2.3 3.8 3 6 3-2 6-8 6-10 3-1.8-2.3-3.8-3-6-3z',
    fill: '#06B6D4'
  });
  svg.append(path);
  return svg;
}

function bootstrapLogo(): SVGSVGElement {
  const svg = baseSvg();
  const rect = svgEl('rect', { x: 2, y: 4, width: 20, height: 16, rx: 3, fill: '#7952B3' });
  const b = svgEl('text', { x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': '800', fill: '#FFFFFF' });
  b.textContent = 'B';
  svg.append(rect, b);
  return svg;
}

function chartjsLogo(): SVGSVGElement {
  const svg = baseSvg();
  const circle = svgEl('circle', { cx: 12, cy: 12, r: 9, fill: '#FF6384', opacity: '0.75' });
  const bar1 = svgEl('rect', { x: 7, y: 10, width: 2.5, height: 6, fill: '#36A2EB' });
  const bar2 = svgEl('rect', { x: 10.5, y: 8, width: 2.5, height: 8, fill: '#FFCE56' });
  const bar3 = svgEl('rect', { x: 14, y: 12, width: 2.5, height: 4, fill: '#4BC0C0' });
  svg.append(circle, bar1, bar2, bar3);
  return svg;
}

function githubLogo(): SVGSVGElement {
  const svg = baseSvg();
  const circle = svgEl('circle', { cx: 12, cy: 12, r: 10, fill: '#181717' });
  const cat = svgEl('path', { d: 'M8 17c-2 0-3-1.3-3-2.7 0-.9.5-1.7 1.2-2.2-.1-.4-.1-1.1 0-1.4 0 0 1.3 0 2.5 1.5.6-.2 1.3-.3 2-.3s1.4.1 2 .3C14 9 15.3 9 15.3 9c.1.3.1 1 0 1.4.8.5 1.3 1.3 1.3 2.2 0 1.4-1 2.7-3 2.7v1.7c0 .3-.2.6-.6.6h-2.4c-.4 0-.6-.3-.6-.6V17z', fill: '#FFFFFF' });
  svg.append(circle, cat);
  return svg;
}

function gitLogo(): SVGSVGElement {
  const svg = baseSvg();
  const diamond = svgEl('rect', { x: 4, y: 4, width: 16, height: 16, transform: 'rotate(45 12 12)', fill: '#F05032' });
  const dot1 = svgEl('circle', { cx: 10, cy: 10, r: 1.8, fill: '#FFFFFF' });
  const dot2 = svgEl('circle', { cx: 14, cy: 14, r: 1.8, fill: '#FFFFFF' });
  const link = svgEl('path', { d: 'M11 11l2 2', stroke: '#FFFFFF', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
  svg.append(diamond, dot1, dot2, link);
  return svg;
}

function nextjsLogo(): SVGSVGElement {
  const svg = baseSvg();
  const circle = svgEl('circle', { cx: 12, cy: 12, r: 10, fill: '#000000' });
  const n = svgEl('path', { d: 'M7 16V8h2l3 4.5V8h3v8h-2l-3-4.5V16z', fill: '#FFFFFF' });
  svg.append(circle, n);
  return svg;
}


export function createBrandLogo(name: string): SVGSVGElement | null {
  const key = name.trim().toLowerCase();
  switch (key) {
    case 'react': return reactLogo();
    case 'angular': return angularLogo();
    case 'node.js': return nodeLogo();
    case 'typescript': return typescriptLogo();
    case 'javascript': return javascriptLogo();
    case 'html': return htmlLogo();
    case 'css': return cssLogo();
    case 'tailwind css': return tailwindLogo();
    case 'bootstrap': return bootstrapLogo();
    case 'chart.js': return chartjsLogo();
    case 'github': return githubLogo();
    case 'git': return gitLogo();
    case 'next.js': return nextjsLogo();
    default: return null;
  }
}

/**
 * Simple Icons CDN fallback
 * If we don't have an inline SVG for a brand, load the official icon via CDN.
 */
const SIMPLE_ICONS_SLUGS: Record<string, string> = {
  'c': 'c',
  'c++': 'cplusplus',
  'c#': 'csharp',
  'python': 'python',
  'java': 'java',
  'javascript': 'javascript',
  'typescript': 'typescript',
  'php': 'php',
  'html': 'html5',
  'css': 'css3',
  'swift': 'swift',
  'react': 'react',
  'angular': 'angular',
  'next.js': 'nextdotjs',
  'three.js': 'threedotjs',
  'vite': 'vite',
  'tailwind css': 'tailwindcss',
  'bootstrap': 'bootstrap',
  'chart.js': 'chartdotjs',
  'recharts': 'recharts',
  'node.js': 'nodedotjs',
  'express.js': 'express',
  'mysql': 'mysql',
  'firebase': 'firebase',
  'firestore': 'firebase',
  'flutter': 'flutter',
  'expo go': 'expo',
  'expo': 'expo',
  'gemini': 'googlegemini',
  'arduino': 'arduino',
  'git': 'git',
  'github': 'github',
  'eslint': 'eslint',
  'prettier': 'prettier',
};

export function createBrandImage(name: string): HTMLImageElement | null {
  const slug = SIMPLE_ICONS_SLUGS[name.trim().toLowerCase()];
  if (!slug) return null;
  const img = document.createElement('img');
  // Prefer local asset first
  img.src = `/brand-logos/${slug}.svg`;
  // Fallback to CDN if local file is missing (404)
  img.onerror = () => {
    img.onerror = null;
    img.src = `https://cdn.simpleicons.org/${slug}`;
  };
  img.setAttribute('alt', '');
  img.setAttribute('aria-hidden', 'true');
  img.setAttribute('loading', 'lazy');
  img.setAttribute('decoding', 'async');
  return img;
}

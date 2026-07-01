import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const outputDir = path.join(root, '.visual-regression');
const currentDir = path.join(outputDir, 'current');
const baselineDir = path.join(outputDir, 'baseline');
const updateBaseline = process.env.VISUAL_UPDATE === '1';
const skipBuild = process.env.VISUAL_SKIP_BUILD === '1';

const scenarios = [
  {
    name: 'desktop-about',
    path: '/about?audit=1',
    viewport: { width: 1440, height: 1100 },
    selectors: ['article[data-page="about"].active', '[data-github-heatmap]', '.tech-stack-section'],
  },
  {
    name: 'desktop-search',
    path: '/about?audit=1',
    viewport: { width: 1440, height: 1100 },
    setup: async (page) => {
      await page.keyboard.press('/');
      await page.keyboard.type('WorkSight');
      await page.waitForSelector('.search-result', { timeout: 5000 });
    },
    selectors: ['.search-overlay', '.search-result'],
  },
  {
    name: 'desktop-command-palette',
    path: '/about?audit=1',
    viewport: { width: 1440, height: 1100 },
    setup: async (page) => {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyK');
      await page.keyboard.up('Control');
      await page.waitForSelector('#command-palette.active', { timeout: 5000 });
    },
    selectors: ['#command-palette.active', '.command-palette-item'],
  },
  {
    name: 'mobile-projects',
    path: '/projects?audit=1',
    viewport: { width: 390, height: 844, isMobile: true },
    selectors: ['article[data-page="projects"].active', '.project-item', '.mobile-action-bar'],
  },
  {
    name: 'mobile-chatbot',
    path: '/about?audit=1',
    viewport: { width: 390, height: 844, isMobile: true },
    setup: async (page) => {
      await page.click('.chatbot-btn');
      await page.waitForSelector('.chatbox.active', { timeout: 7000 });
    },
    selectors: ['.chatbox.active', '.bot-actions'],
  },
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function serveDist() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    let filePath = path.join(distDir, decodeURIComponent(url.pathname));
    if (url.pathname === '/' || !path.extname(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
    }[ext] || 'application/octet-stream';

    response.writeHead(200, { 'content-type': contentType });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: typeof address === 'object' && address ? address.port : 0 });
    });
  });
}

async function imageStats(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const samples = new Set();
  for (let index = 0; index < data.length; index += Math.max(4, Math.floor(data.length / 5000))) {
    samples.add(`${data[index]}-${data[index + 1]}-${data[index + 2]}-${data[index + 3]}`);
  }
  return { uniqueSamples: samples.size, width: info.width, height: info.height };
}

async function diffRatio(currentPath, baselinePath) {
  const currentImage = sharp(currentPath).ensureAlpha();
  const baselineImage = sharp(baselinePath).ensureAlpha();
  const [currentMeta, baselineMeta] = await Promise.all([currentImage.metadata(), baselineImage.metadata()]);
  if (currentMeta.width !== baselineMeta.width || currentMeta.height !== baselineMeta.height) return 1;

  const [current, baseline] = await Promise.all([
    currentImage.raw().toBuffer(),
    baselineImage.raw().toBuffer(),
  ]);

  let changed = 0;
  const pixels = current.length / 4;
  for (let index = 0; index < current.length; index += 4) {
    const delta = Math.abs(current[index] - baseline[index])
      + Math.abs(current[index + 1] - baseline[index + 1])
      + Math.abs(current[index + 2] - baseline[index + 2]);
    if (delta > 90) changed += 1;
  }
  return changed / pixels;
}

if (!skipBuild) {
  await run('npm', ['run', 'build']);
}

fs.mkdirSync(currentDir, { recursive: true });
fs.mkdirSync(baselineDir, { recursive: true });

const { server, port } = await serveDist();
const browser = await puppeteer.launch({ headless: 'new' });
const failures = [];
const createdBaselines = [];

try {
  for (const scenario of scenarios) {
    const page = await browser.newPage();
    await page.setViewport(scenario.viewport);
    await page.goto(`http://127.0.0.1:${port}${scenario.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await scenario.setup?.(page);

    for (const selector of scenario.selectors) {
      await page.waitForSelector(selector, { timeout: 7000 });
    }

    const currentPath = path.join(currentDir, `${scenario.name}.png`);
    const baselinePath = path.join(baselineDir, `${scenario.name}.png`);
    const buffer = await page.screenshot({ path: currentPath, fullPage: true });
    const stats = await imageStats(buffer);

    if (stats.uniqueSamples < 20) {
      failures.push(`${scenario.name}: screenshot appears blank or nearly blank`);
    }

    if (!fs.existsSync(baselinePath) || updateBaseline) {
      fs.copyFileSync(currentPath, baselinePath);
      createdBaselines.push(scenario.name);
    } else {
      const ratio = await diffRatio(currentPath, baselinePath);
      if (ratio > 0.06) {
        failures.push(`${scenario.name}: visual diff ${(ratio * 100).toFixed(2)}% exceeds 6%`);
      }
    }

    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
    console.log(`${scenario.name}: ${stats.width}x${stats.height}, hash ${hash}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (createdBaselines.length) {
  console.log(`Created/updated baseline(s): ${createdBaselines.join(', ')}`);
}

if (failures.length) {
  console.error('Visual regression check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Visual regression check passed.');

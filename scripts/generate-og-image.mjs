#!/usr/bin/env node
/**
 * Renders the live intro stage to the 1200x630 social card used by
 * og:image / twitter:image, so link previews match the site itself.
 *
 * Usage: start `npm run dev` (or `npm run preview`), then
 *   node scripts/generate-og-image.mjs [baseUrl]
 */
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import path from 'node:path';
import { browserOptions } from './browser-options.mjs';

const base = process.argv[2] || 'http://localhost:5173';
const out = path.resolve(import.meta.dirname, '..', 'public', 'images', 'og-card.jpg');

const browser = await puppeteer.launch(browserOptions());
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(`${base}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  // Every orbit photo must be decoded, then let the orbit settle.
  await page.waitForFunction(() => [...document.querySelectorAll('.orbit-card img')]
    .filter((img) => img.offsetParent).every((img) => img.complete && img.naturalWidth > 0), { timeout: 30000 });
  await new Promise((resolve) => setTimeout(resolve, 4200));
  await page.addStyleTag({
    content: `
      .chatbot-btn, .command-palette-trigger, .custom-cursor, .custom-cursor-dot,
      .mobile-action-bar, .back-to-top, .scroll-progress, .stage-scroll,
      .stage-marquee, [class*="command"], [class*="chatbot"] { display: none !important; }
      .stage-nav { visibility: hidden !important; }
      body::after { display: none !important; }
    `,
  });
  await page.mouse.move(-10, -10);
  await new Promise((resolve) => setTimeout(resolve, 300));
  // Render at 2x and downsample: crisper type and photos than a 1x capture.
  const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await sharp(shot).resize(1200, 630, { kernel: 'lanczos3' }).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
} finally {
  await browser.close();
}

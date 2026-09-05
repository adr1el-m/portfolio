import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';
import { browserOptions } from './browser-options.mjs';

const require = createRequire(import.meta.url);
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await puppeteer.launch(browserOptions());
const failures = [];
const results = [];
fs.mkdirSync('.visual-regression/current', { recursive: true });
try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['about', 'stack', 'background', 'projects', 'gear', 'destinations']) {
      await page.goto(`${base}/${route}?audit=1`, { waitUntil: 'networkidle0' });
      await page.waitForSelector(`article.${route}.active`);
      await page.evaluate(async () => {
        // Exercise lazy images and sections, then return to the selected article.
        const article = document.querySelector('article.active');
        for (let y = article.offsetTop; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 35));
        }
        article.scrollIntoView();
      });
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const state = await page.evaluate(async () => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        broken: [...document.querySelectorAll('article.active img')].filter(img => img.getClientRects().length && img.complete && !img.naturalWidth).map(img => img.getAttribute('src')),
        violations: (await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({target:n.target, summary:n.failureSummary})).slice(0,5) })),
      }));
      results.push({ width, route, ...state });
      if (state.overflow > 1 || state.broken.length || state.violations.length) failures.push({ width, route, ...state });
      await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
      if ([390, 1440].includes(width)) await page.screenshot({ path: `.visual-regression/current/review-${width}-${route}.png`, fullPage: true });
      console.log(`${width} ${route}: overflow=${state.overflow}, broken=${state.broken.length}, accessibility=${state.violations.map(v=>v.id).join(',') || 'pass'}`);
    }
    if (errors.length) failures.push({ width, errors });
    await page.close();
  }
} finally { await browser.close(); }
fs.writeFileSync('.visual-regression/current/stress-results.json', JSON.stringify({ results, failures }, null, 2));
assert.equal(failures.length, 0, `${failures.length} failed scenarios; see .visual-regression/current/stress-results.json`);
console.log('All 36 responsive, image, runtime and WCAG scenarios passed.');

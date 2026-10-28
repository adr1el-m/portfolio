import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { browserOptions } from './browser-options.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await puppeteer.launch(browserOptions());
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle0' });
    const layout = await page.evaluate(() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const title = box('#stage-title');
      const actions = box('.stage-actions');
      return {
        portraitLoaded: document.querySelector('.about-portrait img') !== null,
        overflow: document.documentElement.scrollWidth > innerWidth,
        readableTitle: title.width > 0 && title.left >= 0 && title.right <= innerWidth,
        actionsVisible: actions.bottom <= innerHeight - 70,
        animated: document.querySelector('[data-stage]').classList.contains('is-live'),
      };
    });
    assert.equal(layout.portraitLoaded, true, `${width}px: portrait did not load`);
    assert.equal(layout.overflow, false, `${width}px: horizontal overflow`);
    assert.equal(layout.readableTitle, true, `${width}px: clipped title`);
    assert.equal(layout.animated, true, `${width}px: orbit animation did not start`);
  }
  await page.$eval('[data-orbit-project="Paperazzi"]', el => el.click());
  await page.waitForSelector('.project-modal.active', { visible: true });
  assert.equal(await page.$eval('.project-modal.active h2', el => el.textContent.trim()), 'Paperazzi');
  await page.keyboard.press('Escape');
  await page.goto(base, { waitUntil: 'networkidle0' });
  await page.click('.stage-actions [data-resume-preview]');
  await page.waitForSelector('.resume-preview-modal.active', { visible: true });
  await page.keyboard.press('Escape');
  await page.setJavaScriptEnabled(false);
  await page.goto(base, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#stage-title', el => el.getBoundingClientRect().height > 0), true);
  assert.deepEqual(errors, []);
  console.log('Homepage checks passed: five widths, animated orbit, About portrait, project and résumé dialogs, and no-JavaScript introduction.');
} finally {
  await browser.close();
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { browserOptions } from './browser-options.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await puppeteer.launch(browserOptions());
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  let contactRequests = 0;
  page.on('request', async request => {
    if (request.url().includes('/api/contact')) {
      contactRequests++;
      // Exercise delivery UI without sending real email or writing visitor data.
      await new Promise(resolve => setTimeout(resolve, 400));
      return request.respond({ status: 202, contentType: 'application/json', body: JSON.stringify({ delivered: true }) });
    }
    if (/(project-explorer|search)-.*\.js/.test(request.url())) await new Promise(resolve => setTimeout(resolve, 900));
    return request.continue();
  });
  await page.goto(`${base}/about?audit=1`, { waitUntil: 'networkidle0' });
  await page.keyboard.press('/');
  await page.keyboard.type('WorkSight');
  await page.waitForSelector('.search-input');
  assert.equal(await page.$eval('.search-input', el => el.value), 'WorkSight');
  await page.keyboard.press('Escape');
  console.log('Search preserves fast typing during a 900ms delayed bundle.');
  await page.waitForSelector('.command-palette-trigger');
  await page.click('.command-palette-trigger');
  await page.waitForSelector('#command-palette.active');
  await page.type('#command-palette-input', 'compare projects');
  await page.click('[data-command-id="compare-projects"]');
  await page.waitForSelector('.project-comparison-grid article:nth-child(3)');
  console.log('Comparison survives a 900ms delayed lazy module.');

  for (let i = 0; i < 60; i++) {
    const route = ['about', 'background', 'projects', 'gear', 'destinations', 'stack'][i % 6];
    await page.evaluate(route => window.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { page: route } })), route);
    assert.equal(await page.$$eval('article[data-page].active', nodes => nodes.length), 1);
    assert.equal(new URL(page.url()).pathname, `/${route}`);
    assert.equal(await page.$$eval('[data-nav-link][aria-current="page"]', nodes => nodes.length), 1);
  }
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:navigate', {detail:{page:'projects'}})));
  await page.waitForSelector('[data-project-explorer]');
  // Warm the lazy dialog before measuring retained listeners, then collect
  // detached nodes so pending garbage collection is not mistaken for a leak.
  await page.$eval('[data-open-project="WorkSight"]', el => el.click());
  await page.waitForSelector('.project-modal.active');
  await page.keyboard.press('Escape');
  await page.waitForNetworkIdle();
  const cdp = await page.createCDPSession();
  await cdp.send('HeapProfiler.collectGarbage');
  const before = await page.metrics();
  for (let i = 0; i < 20; i++) {
    await page.$eval('[data-open-project="WorkSight"]', el => el.click());
    await page.waitForSelector('.project-modal.active');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.project-modal:not(.active)');
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
  }
  await cdp.send('HeapProfiler.collectGarbage');
  const after = await page.metrics();
  console.log(`Retained listeners: ${before.JSEventListeners} → ${after.JSEventListeners}`);
  assert.equal(await page.$$eval('.project-modal', nodes => nodes.length), 1);
  assert.ok(after.JSEventListeners - before.JSEventListeners < 100, 'Repeated modals accumulated listeners');
  console.log('60 route changes and 20 modal cycles preserve navigation, scroll locks and a single dialog.');

  await page.$eval('a[data-resume-preview]', el => el.focus());
  await page.waitForSelector('.contact-flow-card');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await page.$eval('.contact-flow-copy', el => el.click());
  assert.match(await page.$eval('.contact-flow-status', el => el.textContent), /Copy this email:/);
  await page.$eval('.contact-flow-send', el => el.click());
  assert.equal(contactRequests, 0, 'Empty message reached server');
  await page.$eval('#contact-flow-message', el => { el.value = 'Testing local delivery feedback only.'; });
  await page.$eval('.contact-flow-send', el => { for(let i=0;i<10;i++) el.click(); });
  await page.waitForFunction(() => document.querySelector('.contact-flow-status')?.textContent.includes('Message sent'));
  assert.equal(contactRequests, 1, 'Repeated send produced duplicate submissions');
  assert.equal(await page.$eval('.contact-flow-send', el => el.disabled), false);
  console.log('Clipboard fallback, empty-message validation and duplicate-send prevention pass (delivery stubbed).');

  let detailCount = 0;
  for (const group of ['honors', 'case-studies']) {
    for (const file of fs.readdirSync(`dist/${group}`, { recursive: true }).filter(file => file.endsWith('index.html'))) {
      const route = `/${group}/${file.replace(/\/index\.html$/, '')}`;
      const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.$$eval('h1', nodes => nodes.length), 1, route);
      assert.ok(await page.$eval('link[rel="canonical"]', (el, group) => el.href.includes('/'+group+'/'), group), route);
      detailCount++;
    }
  }
  console.log(`${detailCount} generated honor and case-study pages return 200 with titles and canonicals.`);

  // Test the real worker on a non-audit visit in an isolated browser context.
  const context = await browser.createBrowserContext();
  const offline = await context.newPage();
  await offline.goto(`${base}/about`, {waitUntil:'networkidle0'});
  await offline.waitForFunction(() => Boolean(navigator.serviceWorker.controller), {timeout:15000});
  await offline.reload({waitUntil:'networkidle0'});
  await offline.setOfflineMode(true);
  await offline.reload({waitUntil:'domcontentloaded'});
  await offline.waitForSelector('article.about.active');
  assert.match(await offline.title(), /Adriel/);
  console.log('Deferred service worker registration and offline reload pass.');
  await context.close();
  assert.deepEqual(errors, [], 'Unexpected page exceptions');
} finally { await browser.close(); }

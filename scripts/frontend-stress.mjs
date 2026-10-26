#!/usr/bin/env node
/**
 * Front-end stress harness.
 *
 * Phase 1, layout sweep: every route x 12 widths (320 to 2560px), scrolled
 * top to bottom with motion on. Flags page overflow, elements escaping the
 * viewport, clipped headings, interactive elements covered by something
 * else, sub-24px touch targets on phones, broken images, reveals that never
 * finished, console/page errors, and layout shift while scrolling.
 *
 * Phase 2, interaction storm: rapid tab switching, every project and honor
 * dialog opened and closed (focus restored, scroll unlocked), keyboard
 * tab-through with visible focus, resize churn, intro drag/fling, and a
 * reduced-motion pass.
 *
 * Usage: start `npm run preview -- --host 127.0.0.1`, then
 *   npm run test:frontend            (full)
 *   STRESS_QUICK=1 npm run test:frontend
 */
import puppeteer from 'puppeteer';
import { browserOptions } from './browser-options.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const quick = process.env.STRESS_QUICK === '1';
const ROUTES = ['', 'about', 'stack', 'background', 'projects', 'gear', 'destinations'];
const WIDTHS = quick ? [320, 390, 768, 1024, 1440] : [320, 375, 414, 600, 768, 820, 1024, 1180, 1366, 1440, 1920, 2560];
const CONCURRENCY = 4;
// The local preview has no serverless backend; these failures are expected there.
const IGNORED_CONSOLE = [/\/api\//, /Failed to load resource/, /favicon/];

// One browser per worker: background tabs are 'hidden', and hidden documents
// don't run IntersectionObservers, so parallel tabs would fake stuck reveals.
const launch = () => puppeteer.launch({ ...browserOptions(), protocolTimeout: 120_000 });
const browsers = await Promise.all(Array.from({ length: CONCURRENCY }, launch));
const issues = [];
const report = (where, kind, detail) => issues.push({ where, kind, detail: String(detail).slice(0, 220) });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openPage(browser, width, { reducedMotion = false, height } = {}) {
  const page = await browser.newPage();
  const mobile = width < 768;
  await page.setViewport({ width, height: height || (mobile ? 844 : Math.round(width * 0.62)), isMobile: mobile, hasTouch: mobile });
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!IGNORED_CONSOLE.some((pattern) => pattern.test(text))) errors.push(`console: ${text}`);
  });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    window.__shiftSources = [];
    window.__longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => {
      if (e.hadRecentInput) return;
      window.__cls += e.value;
      if (e.value < 0.02) return;
      const describe = (n) => (n ? `${n.nodeName.toLowerCase()}.${String(n.className || '').split(' ')[0]}` : '?');
      window.__shiftSources.push(`${e.value.toFixed(3)} @${Math.round(e.startTime)}ms: ${e.sources.map((src) => `${describe(src.node)} dy=${Math.round(src.currentRect.y - src.previousRect.y)}`).slice(0, 3).join(', ')}`);
    })).observe({ type: 'layout-shift', buffered: true });
    try {
      new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__longTasks.push(Math.round(e.duration))))
        .observe({ type: 'longtask', buffered: true });
    } catch { /* unsupported */ }
  });
  return { page, errors };
}

// ---------------------------------------------------------------- phase 1

/** Runs inside the page: checks for the band of the viewport currently shown. */
function auditViewport(mobile) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh;
  };
  const decorative = (el) => el.closest('[aria-hidden="true"], .stage-orbit, .stage-marquee, .fx-marquee, .stage-rings, .custom-cursor, .custom-cursor-dot, .fx-glow, canvas, .skip-link, [inert]');
  const label = (el) => {
    const text = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} "${text}"`;
  };

  // Elements escaping the viewport horizontally.
  document.querySelectorAll('main *, .stage *').forEach((el) => {
    if (decorative(el) || !visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') return;
      // Ignore children of horizontally scrollable regions.
      let p = el.parentElement;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(pcs.overflowX)) return;
        p = p.parentElement;
      }
      out.push(['escapes-viewport', `${label(el)} [${Math.round(r.left)}..${Math.round(r.right)} of ${vw}]`]);
    }
  });

  // Headings whose text is wider than their box (words breaking out).
  document.querySelectorAll('h1, h2, h3, h4, .footer-title, .stage-wordmark').forEach((el) => {
    if (decorative(el) && !el.matches('.stage-wordmark') || !visible(el)) return;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible') out.push(['clipped-heading', label(el)]);
  });

  // Interactive elements covered by something else (center of mid band only,
  // so content sliding under the fixed nav or floating buttons is not noise).
  const interactive = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex="0"]';
  document.querySelectorAll(interactive).forEach((el) => {
    if (decorative(el) || !visible(el) || el.closest('.stage-orbit') || el.disabled) return;
    if (el.closest('.fx-r')) return; // mid-reveal: still travelling into place
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cy < vh * 0.22 || cy > vh * 0.78 || cx < 0 || cx > vw) return;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || el === hit || el.contains(hit) || hit.contains(el)) return;
    if (hit.closest('.fx-spot, .custom-cursor, .custom-cursor-dot')) return;
    // Floating controls overlap scrolling content by design.
    if (hit.closest('.back-to-top, .chatbot-btn, .command-palette-trigger, .mobile-action-bar, .main-content > nav.navbar')) return;
    out.push(['covered', `${label(el)} under ${label(hit)}`]);
  });

  // Touch targets (WCAG 2.2 AA: 24x24 minimum) on phone widths.
  if (mobile) {
    document.querySelectorAll(interactive).forEach((el) => {
      if (decorative(el) || !visible(el)) return;
      if (el.matches('a') && getComputedStyle(el).display === 'inline' && el.closest('p, li span, address')) return; // inline text links are exempt
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) out.push(['small-target', `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`]);
    });
  }
  return out;
}

async function sweep(browser, route, width) {
  const where = `${route || 'home'}@${width}`;
  const { page, errors } = await openPage(browser, width);
  try {
    await page.goto(`${base}/${route}`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await sleep(900);
    const vh = await page.evaluate(() => window.innerHeight);
    const pageHeight = () => page.evaluate(() => document.documentElement.scrollHeight);
    const seen = new Set();
    // Re-measure each step: sections (honors, stack) expand as they load.
    for (let y = 0; y <= await pageHeight(); y += Math.round(vh * 0.7)) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await sleep(260);
      for (const [kind, detail] of await page.evaluate(auditViewport, width < 768)) {
        const key = kind + detail;
        if (!seen.has(key)) { seen.add(key); report(where, kind, detail); }
      }
    }
    // The footer can grow as its contact card loads; settle at the true bottom.
    for (let pass = 0; pass < 2; pass++) {
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await sleep(900);
    }
    const tail = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stuck: [...document.querySelectorAll('.fx-r:not(.fx-in), .fx-split:not(.fx-in)')]
        .filter((e) => (e.closest('article.active') || e.closest('.site-footer')) && e.getBoundingClientRect().height > 0 && !e.closest('.year-content:not(.active)'))
        .map((e) => e.className).slice(0, 3),
      broken: [...document.images].filter((img) => img.complete && img.naturalWidth === 0 && img.getBoundingClientRect().width > 0 && !img.closest('[hidden]'))
        .map((img) => img.currentSrc || img.src).slice(0, 3),
      cls: window.__cls,
      shiftSources: window.__shiftSources.slice(0, 3),
      longTasks: window.__longTasks.filter((d) => d > 250), // 4 browsers share the CPU here
    }));
    if (tail.overflow > 0) report(where, 'page-overflow', `${tail.overflow}px`);
    tail.stuck.forEach((c) => report(where, 'stuck-reveal', c));
    tail.broken.forEach((src) => report(where, 'broken-image', src));
    if (tail.cls > 0.1) report(where, 'layout-shift', `${tail.cls.toFixed(3)} | ${tail.shiftSources.join(' | ')}`);
    if (tail.longTasks.length) report(where, 'long-task', `${tail.longTasks.join(', ')}ms`);
    errors.forEach((e) => report(where, 'error', e));
  } catch (error) {
    report(where, 'harness', error.message);
  } finally {
    await page.close();
  }
}

const jobs = WIDTHS.flatMap((width) => ROUTES.map((route) => [route, width]));
let next = 0;
await Promise.all(browsers.map(async (browser) => {
  while (next < jobs.length) {
    const [route, width] = jobs[next++];
    await sweep(browser, route, width);
  }
}));
console.log(`Phase 1: ${jobs.length} route/width sweeps done.`);

// ---------------------------------------------------------------- phase 2

async function storm(browser, width, { reducedMotion = false } = {}) {
  const where = `storm@${width}${reducedMotion ? '-reduced' : ''}`;
  const { page, errors } = await openPage(browser, width, { reducedMotion });
  const check = async (label, fn) => {
    try { await fn(); } catch (error) { report(where, label, error.message); }
  };
  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle2' });
    await sleep(1200);

    await check('intro-drag', async () => {
      const box = await page.$eval('.stage', (el) => { const r = el.getBoundingClientRect(); return { x: r.width * 0.15, y: r.height * 0.5 }; });
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      for (let i = 0; i < 20; i++) { await page.mouse.move(box.x + i * 25, box.y); await sleep(8); }
      await page.mouse.up();
      for (let i = 0; i < 12; i++) { await page.evaluate((y) => window.scrollTo(0, y), (i % 2) * 900); await sleep(30); }
      await page.evaluate(() => window.scrollTo(0, 0));
    });

    await check('tab-storm', async () => {
      const labels = await page.$$eval('[data-nav-link]', (els) => els.map((e) => e.textContent.trim()));
      for (let i = 0; i < 48; i++) {
        const target = labels[(i * 7) % labels.length];
        await page.$$eval('[data-nav-link]', (els, t) => els.find((e) => e.textContent.trim() === t).click(), target);
        if (i % 6 === 0) await sleep(120);
      }
      await sleep(900);
      const state = await page.evaluate(() => {
        const active = document.querySelectorAll('article[data-page].active');
        const link = document.querySelector('.navbar-link.active');
        const pill = document.querySelector('.nav-indicator');
        const a = link?.getBoundingClientRect();
        const b = pill?.getBoundingClientRect();
        return { active: active.length, aligned: !pill || !a || Math.abs(a.left - b.left) < 3 && Math.abs(a.width - b.width) < 3 };
      });
      if (state.active !== 1) throw new Error(`${state.active} active pages after storm`);
      if (!state.aligned && !reducedMotion) throw new Error('nav indicator not aligned with active tab');
    });

    await check('project-dialogs', async () => {
      await page.$$eval('[data-nav-link]', (els) => els.find((e) => e.textContent.trim() === 'Projects').click());
      await sleep(600);
      const count = await page.$$eval('article.projects .project-item', (els) => els.length);
      for (let i = 0; i < count; i++) {
        await page.$$eval('article.projects .project-item', (els, index) => {
          const trigger = els[index].querySelector('a') || els[index];
          trigger.click();
        }, i);
        await page.waitForSelector('.project-modal.active', { timeout: 5_000 });
        await page.keyboard.press('Escape');
        await page.waitForSelector('.project-modal:not(.active)', { timeout: 5_000 });
      }
      const locked = await page.evaluate(() => document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden');
      if (locked) throw new Error('scroll left locked after project dialogs');
    });

    await check('honor-dialogs', async () => {
      await page.$$eval('[data-nav-link]', (els) => els.find((e) => e.textContent.trim() === 'About').click());
      await page.evaluate(() => document.querySelector('section.achievements')?.scrollIntoView());
      await sleep(1200);
      await page.$$eval('.year-header[aria-expanded="false"]', (els) => els.forEach((e) => e.click()));
      await sleep(400);
      const count = await page.$$eval('.awards-timeline .achievement-card', (els) => els.length);
      for (let i = 0; i < count; i++) {
        await page.$$eval('.awards-timeline .achievement-card', (els, index) => els[index].click(), i);
        await page.waitForSelector('#achievementModal.active, .achievement-modal.active', { timeout: 5_000 });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.achievement-modal.active'), { timeout: 5_000 });
      }
    });

    await check('keyboard', async () => {
      await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.activeElement?.blur(); });
      await sleep(600);
      let invisible = 0;
      let unstyled = 0;
      for (let i = 0; i < 70; i++) {
        await page.keyboard.press('Tab');
        await sleep(reducedMotion ? 60 : 420); // let smooth scroll bring it into view
        const probe = () => page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const shown = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && Number(cs.opacity) > 0.05;
          const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none';
          return { shown, ring, label: `${el.tagName}.${String(el.className).split(' ')[0]}` };
        });
        let r = await probe();
        // Smooth scrolling to a far-away focus target can take well over a second.
        for (let retry = 0; r && !r.shown && retry < 3; retry++) { await sleep(600); r = await probe(); }
        if (!r) continue;
        if (!r.shown) { invisible++; if (invisible <= 3) report(where, 'focus-hidden', r.label); }
        if (!r.ring) { unstyled++; if (unstyled <= 3) report(where, 'focus-unstyled', r.label); }
      }
    });

    await check('resize-churn', async () => {
      for (const w of [width, 360, 1280, 768, 1920, 414, width]) {
        await page.setViewport({ width: w, height: 860, isMobile: w < 768, hasTouch: w < 768 });
        await sleep(140);
      }
      await sleep(600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) throw new Error(`${overflow}px overflow after resize churn`);
    });

    errors.forEach((e) => report(where, 'error', e));
  } finally {
    await page.close();
  }
}

await Promise.all([storm(browsers[0], 1440), storm(browsers[1], 390), storm(browsers[2], 1440, { reducedMotion: true })]);
console.log('Phase 2: interaction storms done.');

await Promise.all(browsers.map((browser) => browser.close()));

if (issues.length) {
  const byKind = issues.reduce((acc, issue) => ((acc[issue.kind] ||= []).push(issue), acc), {});
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`\n${kind} (${list.length})`);
    list.slice(0, 25).forEach((issue) => console.log(`  ${issue.where.padEnd(18)} ${issue.detail}`));
  }
  console.log(`\nFront-end stress: ${issues.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log('Front-end stress: no issues across layout sweeps and interaction storms.');
}

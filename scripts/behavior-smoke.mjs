import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';

const root = process.cwd();
const dist = path.join(root, 'dist');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code})`)));
  });
}

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const caseMatch = url.pathname.match(/^\/case-studies\/([^/]+)$/);
    const file = caseMatch ? path.join(dist, 'case-studies', caseMatch[1], 'index.html') : (!path.extname(url.pathname) ? path.join(dist, 'index.html') : path.join(dist, url.pathname));
    if (!file.startsWith(dist) || !fs.existsSync(file)) return res.writeHead(404).end('Not found');
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.mp4') ? 'video/mp4' : 'text/html';
    res.writeHead(200, { 'content-type': type }); fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

await run('npm', ['run', 'build']);
const { server, port } = await serve();
const browser = await puppeteer.launch({ headless: 'new' });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/projects?role=ai&audit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.role-path-brief');
  // Resume is a global action and must work before About has ever loaded.
  await page.waitForSelector('[data-mobile-action="resume"]');
  await page.$eval('a[data-resume-preview]', (link) => link.click());
  await page.waitForSelector('.resume-preview-modal.active');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.resume-preview-modal:not(.active)');
  await page.waitForSelector('[data-project-explorer]');
  await page.select('[data-project-filter="stack"]', 'TypeScript');
  const explorerStatus = await page.$eval('.project-explorer-status', (el) => el.textContent || '');
  if (!/of \d+ projects shown/.test(explorerStatus)) throw new Error('Project explorer filter status did not render');
  await page.select('[data-project-filter="stack"]', 'all');
  await page.click('[data-compare-project]');
  await page.waitForSelector('.project-comparison-grid article');
  await page.click('[data-open-project="WorkSight"]');
  await page.waitForSelector('.project-modal.active .project-proof:not([hidden])');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.project-modal:not(.active)');
  await page.$$eval('[data-nav-link]', (buttons) => buttons.find((button) => button.textContent.trim() === 'Gear').click());
  await page.waitForSelector('article.gear.active');
  await page.goBack();
  await page.waitForSelector('article.projects.active');
  const backNav = await page.$$eval('[data-nav-link][aria-current="page"]', (buttons) => buttons.map((button) => button.textContent.trim()).join());
  if (backNav !== 'Projects') throw new Error(`Back navigation ARIA state failed: ${backNav}`);
  await page.goForward();
  await page.waitForSelector('article.gear.active');
  const forwardNav = await page.$$eval('[data-nav-link][aria-current="page"]', (buttons) => buttons.map((button) => button.textContent.trim()).join());
  if (forwardNav !== 'Gear') throw new Error(`Forward navigation ARIA state failed: ${forwardNav}`);
  await page.goto(`http://127.0.0.1:${port}/about?audit=1`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const skip = await page.$eval('.skip-link', (el) => ({ text: el.textContent, focused: document.activeElement === el }));
  if (!skip.text?.includes('Skip') || !skip.focused) throw new Error('Skip link did not receive keyboard focus');
  await page.keyboard.press('Enter');
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused !== 'main-content') throw new Error(`Skip link focus target failed: ${focused}`);
  await page.waitForSelector('#portfolio-changelog');
  const changelog = await page.$eval('#portfolio-changelog', (el) => ({ text: el.textContent || '', open: el.open, separate: Boolean(el.closest('.release-sidebar')) }));
  if (!changelog.text.includes('Project explorer & comparison') || changelog.open || !changelog.separate) throw new Error('Separate sidebar changelog dropdown did not render closed');
  await page.click('#portfolio-changelog summary');
  await page.waitForSelector('#portfolio-changelog[open]');
  await page.waitForSelector('.command-palette-trigger');
  await page.click('.command-palette-trigger');
  await page.waitForSelector('#command-palette.active');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  const trapped = await page.$eval('.command-palette-close', (button) => document.activeElement === button);
  if (!trapped) throw new Error('Command palette did not wrap keyboard focus');
  await page.keyboard.press('Escape');
  const restored = await page.$eval('.command-palette-trigger', (button) => document.activeElement === button);
  if (!restored) throw new Error('Command palette did not restore trigger focus');
  await page.click('.command-palette-trigger');
  await page.waitForSelector('#command-palette.active');
  await page.$eval('#command-palette-input', (input) => {
    input.value = 'compare projects';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('[data-command-id="compare-projects"]');
  await page.waitForSelector('.project-comparison-grid article:nth-child(3)');
  await page.goto(`http://127.0.0.1:${port}/destinations`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article[data-page="destinations"].active');
  const papers = await page.$eval('article[data-page="destinations"] .web-destination-card', (el) => el.getAttribute('href'));
  if (papers !== 'https://papers.adrielmagalona.dev/') throw new Error('Papers destination link did not render');
  const caseResponse = await page.goto(`http://127.0.0.1:${port}/case-studies/worksight`);
  if (caseResponse?.status() !== 200) throw new Error('Case-study page route failed');
  console.log('Behavior smoke tests passed: role path, explorer filters/comparison, global resume, navigation history/ARIA, command palette focus, modal, Escape, changelog, skip link, and case-study route.');
} finally { await browser.close(); server.close(); }

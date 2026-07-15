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
  await page.goto(`http://127.0.0.1:${port}/about?audit=1`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const skip = await page.$eval('.skip-link', (el) => ({ text: el.textContent, focused: document.activeElement === el }));
  if (!skip.text?.includes('Skip') || !skip.focused) throw new Error('Skip link did not receive keyboard focus');
  await page.keyboard.press('Enter');
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused !== 'main-content') throw new Error(`Skip link focus target failed: ${focused}`);
  await page.waitForSelector('#portfolio-changelog');
  const changelog = await page.$eval('#portfolio-changelog', (el) => el.textContent || '');
  if (!changelog.includes('Project explorer and recruiter comparison')) throw new Error('Portfolio changelog entry did not render');
  await page.waitForSelector('.command-palette-trigger');
  await page.click('.command-palette-trigger');
  await page.waitForSelector('#command-palette.active');
  await page.$eval('#command-palette-input', (input) => {
    input.value = 'compare projects';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.click('[data-command-id="compare-projects"]');
  await page.waitForSelector('.project-comparison-grid article:nth-child(3)');
  const caseResponse = await page.goto(`http://127.0.0.1:${port}/case-studies/worksight`);
  if (caseResponse?.status() !== 200) throw new Error('Case-study page route failed');
  console.log('Behavior smoke tests passed: role path, explorer filters/comparison, command palette, modal, Escape, changelog, skip link, and case-study route.');
} finally { await browser.close(); server.close(); }

import fs from 'node:fs';
import puppeteer from 'puppeteer';

// Prefer the explicitly configured or Puppeteer-managed browser. Fall back to
// Chrome on macOS so a local audit does not require a second browser download.
export function browserOptions() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH || fs.existsSync(puppeteer.executablePath())) return { headless: true };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return fs.existsSync(chrome) ? { headless: true, executablePath: chrome } : { headless: true };
}

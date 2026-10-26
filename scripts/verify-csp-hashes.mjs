#!/usr/bin/env node
/**
 * Inline <script> blocks only run in production if their sha256 is listed in
 * the CSP (vercel.json). Fail the build when the two drift apart, and print
 * the hash to paste in.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const csp = config.headers
  .flatMap((rule) => rule.headers)
  .find((header) => header.key === 'Content-Security-Policy')?.value || '';
const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) || '';

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .filter((body) => body.trim());

const missing = inline
  .map((body) => `'sha256-${crypto.createHash('sha256').update(body, 'utf8').digest('base64')}'`)
  .filter((hash) => !scriptSrc.includes(hash));

if (missing.length) {
  console.error(`CSP is missing ${missing.length} inline script hash(es). Add to script-src in vercel.json:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`CSP covers all ${inline.length} inline script(s).`);

#!/usr/bin/env node
/**
 * Builds the small WebP thumbnails used by the hero orbit.
 * Source photos are full-size honors/project assets (often 200-550 KB);
 * the orbit only needs ~250px cards, so each output stays well under 30 KB.
 *
 * Usage: node scripts/generate-orbit-thumbs.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'public', 'images');
const OUT = path.join(ROOT, 'orbit');

/** [output name, source path relative to public/images, optional crop gravity] */
const SOURCES = [
  ['technovation-champion', 'honors/2025/technovation-summit/3.avif'],
  ['start-a-ton-champion', 'honors/2026/start-a-ton/winners-champion.avif'],
  ['appcon-pitching', 'honors/2026/appcon-paperazzi/best-in-pitching.avif'],
  ['bpi-datawave', 'honors/2025/bpi-datawave/1.avif', 'north'],
  ['hack-it', 'honors/2025/hack-it/2.avif'],
  ['spark-rush', 'honors/2025/spark-rush/1.avif'],
  ['eneda', 'honors/2024/eneda/1.avif', 'north'],
  ['dlsu-hackercup', 'honors/2025/dlsu-hackercup/3.avif'],
  ['agentic-ai', 'honors/2025/agentic-ai/1.avif'],
  ['geospectrum', 'honors/2026/geospectrum/geospectrum.avif', 'north'],
  ['paperazzi', 'projects/paperazzi/hero.avif'],
  ['odrs', 'projects/odrs/1-800.avif'],
  ['genesync', 'projects/genesync/genesync-demo.poster.jpg'],
  ['green-pulse', 'projects/green-pulse/green-pulse-mock-800.avif'],
  ['dokq', 'projects/dokq/1-800.avif', 'north'],
  ['lingap-link', 'projects/lingap-link/lingap-link.poster.jpg'],
];

await fs.mkdir(OUT, { recursive: true });
// 1x for standard screens, @2x for high-DPI (front cards render ~250 CSS px).
const VARIANTS = [
  { suffix: '', width: 400, height: 280, quality: 64 },
  { suffix: '@2x', width: 600, height: 420, quality: 58 },
];
const totals = Object.fromEntries(VARIANTS.map((v) => [v.suffix || '1x', 0]));
for (const [name, src, position = 'attention'] of SOURCES) {
  for (const { suffix, width, height, quality } of VARIANTS) {
    const info = await sharp(path.join(ROOT, src))
      .resize(width, height, { fit: 'cover', position })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(path.join(OUT, `${name}${suffix}.webp`));
    totals[suffix || '1x'] += info.size;
  }
}
for (const [variant, size] of Object.entries(totals)) {
  console.log(`${variant}: ${(size / 1024).toFixed(1)} KB across ${SOURCES.length} thumbnails`);
}

#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const imagesDir = path.join(root, 'public', 'images');
const projectsDir = path.join(imagesDir, 'projects');

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function convertAvatar() {
  const avatarPath = path.join(imagesDir, 'my-avatar.png');
  const exists = await ensureFileExists(avatarPath);
  if (!exists) {
    console.warn('Avatar not found:', avatarPath);
    return;
  }
  const outAvif80 = path.join(imagesDir, 'my-avatar.avif');
  const outAvif160 = path.join(imagesDir, 'my-avatar@2x.avif');
  const outWebp80 = path.join(imagesDir, 'my-avatar.webp');
  const outWebp160 = path.join(imagesDir, 'my-avatar@2x.webp');
  const outPng160 = path.join(imagesDir, 'my-avatar@2x.png');

  const img = sharp(avatarPath);
  const meta = await img.metadata();
  const target80 = 80;
  const target160 = 160;

  // 80px AVIF/WEBP
  await img
    .resize({ width: Math.min(target80, meta.width || target80) })
    .avif({ quality: 60 })
    .toFile(outAvif80);

  await img
    .resize({ width: Math.min(target80, meta.width || target80) })
    .webp({ quality: 70 })
    .toFile(outWebp80);

  // 160px AVIF/WEBP/PNG @2x
  await img
    .resize({ width: Math.min(target160, meta.width || target160) })
    .avif({ quality: 60 })
    .toFile(outAvif160);

  await img
    .resize({ width: Math.min(target160, meta.width || target160) })
    .webp({ quality: 70 })
    .toFile(outWebp160);

  await img
    .resize({ width: Math.min(target160, meta.width || target160) })
    .png({ quality: 90 })
    .toFile(outPng160);

  console.log('Avatar converted to AVIF/WEBP with 80px and 160px variants.');
}

const exts = new Set(['.jpg', '.jpeg', '.png']);
const widths = [400, 800, 1200];

async function convertProjectImages() {
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(projectsDir, entry.name);
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!exts.has(ext)) continue;
      const name = path.basename(file, ext);
      const inputPath = path.join(dirPath, file);
      const img = sharp(inputPath);
      const meta = await img.metadata();
      for (const w of widths) {
        const target = Math.min(w, meta.width || w);
        const avifOut = path.join(dirPath, `${name}-${target}.avif`);
        const webpOut = path.join(dirPath, `${name}-${target}.webp`);
        await img
          .resize({ width: target })
          .avif({ quality: 60 })
          .toFile(avifOut);
        await img
          .resize({ width: target })
          .webp({ quality: 70 })
          .toFile(webpOut);
      }
      console.log(`Converted ${inputPath} -> AVIF/WEBP at widths ${widths.join(', ')}`);
    }
  }
}

async function main() {
  await convertAvatar();
  await convertProjectImages();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
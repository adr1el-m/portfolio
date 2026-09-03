#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const imagesDir = path.join(root, 'public', 'images');
const projectsDir = path.join(imagesDir, 'projects');
const orgsDir = path.join(imagesDir, 'orgs');
const honorsDir = path.join(imagesDir, 'honors');
const bgDir = path.join(imagesDir, 'background');

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getAllImageFiles(dir, exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...(await getAllImageFiles(fullPath, exts)));
    } else if (dirent.isFile()) {
      const ext = path.extname(dirent.name).toLowerCase();
      if (exts.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

// Convert Avatar to crisp, optimized 80px & 160px AVIF/WebP/PNG
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
  await sharp(avatarPath)
    .resize({ width: Math.min(target80, meta.width || target80) })
    .avif({ quality: 80, effort: 6 })
    .toFile(outAvif80);

  await sharp(avatarPath)
    .resize({ width: Math.min(target80, meta.width || target80) })
    .webp({ quality: 85, effort: 6 })
    .toFile(outWebp80);

  // 160px AVIF/WEBP/PNG @2x
  await sharp(avatarPath)
    .resize({ width: Math.min(target160, meta.width || target160) })
    .avif({ quality: 80, effort: 6 })
    .toFile(outAvif160);

  await sharp(avatarPath)
    .resize({ width: Math.min(target160, meta.width || target160) })
    .webp({ quality: 85, effort: 6 })
    .toFile(outWebp160);

  await sharp(avatarPath)
    .resize({ width: Math.min(target160, meta.width || target160) })
    .png({ quality: 90 })
    .toFile(outPng160);

  console.log('✅ Avatar converted to crisp AVIF/WEBP (80px & 160px).');
}

// Convert Background images
async function convertBackground() {
  const bgFiles = await getAllImageFiles(bgDir, new Set(['.png', '.jpg', '.jpeg']));
  for (const file of bgFiles) {
    const dir = path.dirname(file);
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    const avifOut = path.join(dir, `${name}.avif`);
    const webpOut = path.join(dir, `${name}.webp`);

    await sharp(file)
      .resize({ width: 1200, withoutEnlargement: true })
      .avif({ quality: 78, effort: 6 })
      .toFile(avifOut);

    await sharp(file)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(webpOut);

    console.log(`✅ Background converted: ${name} -> AVIF/WebP`);
  }
}

// Convert project images to responsive widths (400, 800, 1200)
const projectWidths = [400, 800, 1200];
async function convertProjectImages() {
  const entries = await fs.readdir(projectsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(projectsDir, entry.name);
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      // Skip generated files and videos
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
      if (file.endsWith('.poster.jpg')) continue;
      if (/-\d+\.(avif|webp)$/.test(file)) continue;

      const name = path.basename(file, ext);
      const inputPath = path.join(dirPath, file);
      const img = sharp(inputPath);
      const meta = await img.metadata();

      for (const w of projectWidths) {
        const target = Math.min(w, meta.width || w);
        const avifOut = path.join(dirPath, `${name}-${w}.avif`);
        const webpOut = path.join(dirPath, `${name}-${w}.webp`);

        await sharp(inputPath)
          .resize({ width: target, withoutEnlargement: true })
          .avif({ quality: 78, effort: 6 })
          .toFile(avifOut);

        await sharp(inputPath)
          .resize({ width: target, withoutEnlargement: true })
          .webp({ quality: 82, effort: 6 })
          .toFile(webpOut);
      }

      // Also create base full-res .avif and .webp
      const baseAvif = path.join(dirPath, `${name}.avif`);
      const baseWebp = path.join(dirPath, `${name}.webp`);
      await sharp(inputPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .avif({ quality: 78, effort: 6 })
        .toFile(baseAvif);
      await sharp(inputPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82, effort: 6 })
        .toFile(baseWebp);

      console.log(`✅ Converted project image: ${entry.name}/${file} -> AVIF/WebP (${projectWidths.join(', ')})`);
    }
  }
}

// Convert all honors/awards images recursively
async function convertHonorsImages() {
  const files = await getAllImageFiles(honorsDir, new Set(['.png', '.jpg', '.jpeg']));
  for (const file of files) {
    const dir = path.dirname(file);
    const ext = path.extname(file);
    const name = path.basename(file, ext);
    const avifOut = path.join(dir, `${name}.avif`);
    const webpOut = path.join(dir, `${name}.webp`);

    const img = sharp(file);
    const meta = await img.metadata();
    const targetWidth = Math.min(1600, meta.width || 1600);

    await sharp(file)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .avif({ quality: 78, effort: 6 })
      .toFile(avifOut);

    await sharp(file)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(webpOut);

    console.log(`✅ Converted honors image: ${path.relative(honorsDir, file)} -> AVIF/WebP (${targetWidth}px)`);
  }

  // Also optimize any existing huge .avif in honors (like agora 2.avif, 3.avif)
  const avifFiles = await getAllImageFiles(honorsDir, new Set(['.avif']));
  for (const file of avifFiles) {
    const stat = await fs.stat(file);
    if (stat.size > 500 * 1024) { // >500KB AVIF needs re-encoding
      const tempPath = `${file}.tmp.avif`;
      const img = sharp(file);
      const meta = await img.metadata();
      const targetWidth = Math.min(1600, meta.width || 1600);

      await sharp(file)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .avif({ quality: 78, effort: 6 })
        .toFile(tempPath);

      await fs.rename(tempPath, file);
      const newStat = await fs.stat(file);
      console.log(`✅ Re-compressed oversized AVIF: ${path.relative(honorsDir, file)} (${(stat.size/1024).toFixed(0)}KB -> ${(newStat.size/1024).toFixed(0)}KB)`);
    }
  }
}

// Convert organization logos to lightweight AVIF/WEBP (80px/160px)
async function convertOrgLogos() {
  try {
    const exists = await ensureFileExists(orgsDir);
    if (!exists) return;
    const entries = await fs.readdir(orgsDir, { withFileTypes: true });
    const exts = new Set(['.jpg', '.jpeg', '.png']);
    const widths = [80, 160];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const file = entry.name;
      const ext = path.extname(file).toLowerCase();
      if (!exts.has(ext)) continue;
      const name = path.basename(file, ext);
      const inputPath = path.join(orgsDir, file);
      const img = sharp(inputPath);
      const meta = await img.metadata();

      for (const w of widths) {
        const target = Math.min(w, meta.width || w);
        const avifOut = path.join(orgsDir, `${name}-${w}.avif`);
        const webpOut = path.join(orgsDir, `${name}-${w}.webp`);
        await sharp(inputPath)
          .resize({ width: target })
          .avif({ quality: 80, effort: 6 })
          .toFile(avifOut);
        await sharp(inputPath)
          .resize({ width: target })
          .webp({ quality: 85, effort: 6 })
          .toFile(webpOut);
      }
      console.log(`✅ Converted org logo: ${file} -> AVIF/WEBP (80px, 160px)`);
    }
  } catch (e) {
    console.warn('convertOrgLogos: skipped or failed', e);
  }
}

async function main() {
  console.log('🚀 Starting portfolio image conversion to high-quality AVIF & WebP...');
  await convertAvatar();
  await convertBackground();
  await convertProjectImages();
  await convertHonorsImages();
  await convertOrgLogos();
  console.log('🎉 All image conversions completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
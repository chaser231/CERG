/**
 * Image Optimization Script
 * Converts PNG images to optimized WebP format
 * 
 * Usage: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';

const IMAGES_DIR = './public/images';
const OUTPUT_DIR = './public/images-optimized';

// Size limits per folder
const SIZE_LIMITS = {
  hero: { width: 1920, height: 1080 },
  directions: { width: 600, height: 400 },
  services: { width: 800, height: 600 },
  training: { width: 600, height: 400 },
  reviews: { width: 600, height: 800 },
  experts: { width: 800, height: 1000 },
  faq: { width: 800, height: 600 },
  default: { width: 1200, height: 900 }
};

async function getFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getFiles(fullPath));
    } else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function getFolder(filePath) {
  const parts = filePath.split('/');
  const imagesIndex = parts.indexOf('images');
  if (imagesIndex !== -1 && parts[imagesIndex + 1]) {
    return parts[imagesIndex + 1];
  }
  return 'default';
}

async function optimizeImage(inputPath) {
  const folder = getFolder(inputPath);
  const limits = SIZE_LIMITS[folder] || SIZE_LIMITS.default;
  
  // Get path relative to IMAGES_DIR (remove ./public/images/ prefix)
  const relativePath = inputPath.replace(/^\.\/public\/images\//, '');
  const outputPath = join(OUTPUT_DIR, relativePath.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
  const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  
  // Create output directory
  await mkdir(outputDir, { recursive: true });
  
  const inputStats = await stat(inputPath);
  const inputSizeKB = Math.round(inputStats.size / 1024);
  
  await sharp(inputPath)
    .resize(limits.width, limits.height, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toFile(outputPath);
  
  const outputStats = await stat(outputPath);
  const outputSizeKB = Math.round(outputStats.size / 1024);
  const savings = Math.round((1 - outputStats.size / inputStats.size) * 100);
  
  console.log(`✓ ${basename(inputPath)}: ${inputSizeKB}KB → ${outputSizeKB}KB (${savings}% saved)`);
  
  return { input: inputSizeKB, output: outputSizeKB };
}

async function main() {
  console.log('🖼️  Starting image optimization...\n');
  
  const files = await getFiles(IMAGES_DIR);
  console.log(`Found ${files.length} images to optimize\n`);
  
  let totalInput = 0;
  let totalOutput = 0;
  
  for (const file of files) {
    try {
      const { input, output } = await optimizeImage(file);
      totalInput += input;
      totalOutput += output;
    } catch (err) {
      console.error(`✗ ${basename(file)}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total: ${Math.round(totalInput / 1024)}MB → ${Math.round(totalOutput / 1024)}MB`);
  console.log(`💾 Saved: ${Math.round((totalInput - totalOutput) / 1024)}MB (${Math.round((1 - totalOutput / totalInput) * 100)}%)`);
  console.log('\n📁 Optimized images saved to:', OUTPUT_DIR);
  console.log('\n⚠️  To use: Replace public/images with public/images-optimized');
}

main().catch(console.error);


/**
 * generate-manifest.js
 * Scans images/galeria/ and images/360/ directories
 * and generates a manifest.json for the website to consume.
 * 
 * Run: node generate-manifest.js
 * This runs automatically on Vercel build.
 */

const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, 'images', 'galeria');
const PANO_DIR = path.join(__dirname, 'images', '360');
const OUTPUT = path.join(__dirname, 'manifest.json');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff'];

function getImageFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return [];
  }

  return fs.readdirSync(dir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext) && !file.startsWith('.');
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Scan directories
const galleryFiles = getImageFiles(GALLERY_DIR);
const panoramaFiles = getImageFiles(PANO_DIR);

const manifest = {
  generatedAt: new Date().toISOString(),
  gallery: galleryFiles.map((file, i) => ({
    src: `images/galeria/${file}`,
    alt: `Toma aérea profesional ${i + 1}`,
    title: `Vista Aérea ${i + 1}`,
    desc: 'Captura profesional con DJI Air 2S — 20MP'
  })),
  panorama: panoramaFiles.map((file, i) => ({
    src: `images/360/${file}`,
    alt: `Panorámica 360° - Vista ${i + 1}`,
    label: `Vista ${i + 1}`
  }))
};

fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(`✅ Manifest generated: ${OUTPUT}`);
console.log(`   📸 Gallery images: ${galleryFiles.length}`);
console.log(`   🌐 360° images:    ${panoramaFiles.length}`);

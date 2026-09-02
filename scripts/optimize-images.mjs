#!/usr/bin/env node
// =====================================================
// Generates AVIF + WebP responsive variants for content photos, per the
// design system's rules/images.md: three widths (640/960/1536, skipping
// any that would upscale past the source), two formats, named
// "{name}-{width}.{format}" next to the source image.
//
// Run ONCE per new/changed source photo (`node scripts/optimize-images.mjs`
// or `npm run optimize-images`), not on every build — matches this
// project's "no build-step" default (rules/architecture.md). The
// generated files are committed like any other static asset.
//
// This never touches the source .webp/.jpg files themselves — only adds
// new sibling files — so the images already in place don't change.
// =====================================================

import sharp from "sharp";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename, extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const WIDTHS = [640, 960, 1536];

// Every real content photo referenced from index.html — hero, gallery,
// project shots, the portrait. Icons/favicons/logo are out of scope
// (rules/images.md: "not every <img> on the page"). Paths are written
// "./assets/..." (leading dot-slash) to match exactly how they appear in
// csv/*.csv and index.html — render.js looks them up in the generated
// manifest by this same literal string, so the two must agree.
const SOURCES = [
  "./assets/projects/cabane/cabane-hero.webp",
  "./assets/projects/cabane/cabane-exterior.webp",
  "./assets/projects/cabane/cabane-interior.webp",
  "./assets/projects/cabane/cabane-bedroom.webp",
  "./assets/projects/cabane/cabane-plan.webp",
  "./assets/projects/nike/nike-storefront.webp",
  "./assets/projects/nike/nike-poster.webp",
  "./assets/projects/veranda/veranda-mood-exterior.webp",
  "./assets/projects/veranda/veranda-exterior.webp",
  "./assets/projects/veranda/veranda-interior.webp",
  "./assets/projects/veranda/veranda-plan.webp",
  "./assets/projects/veranda/veranda-garden.webp",
  "./assets/projects/cave/cave-lounge.webp",
  "./assets/projects/cave/cave-tasting.webp",
  "./assets/projects/cave/cave-plan.webp",
  "./assets/projects/archive/louboutin.webp",
  "./assets/projects/archive/residence.webp",
  "./assets/projects/archive/chair.webp",
  "./assets/projects/archive/equilibre.webp",
  "./assets/projects/archive/vitrine.webp",
  "./assets/jeanne-portrait.jpg",
];

async function processImage(relativePath) {
  const absPath = resolve(root, relativePath);
  if (!existsSync(absPath)) {
    console.warn(`skip (not found): ${relativePath}`);
    return [];
  }
  const ext = extname(absPath);
  const base = basename(absPath, ext);
  const dir = dirname(absPath);
  const image = sharp(absPath);
  const meta = await image.metadata();
  const sourceWidth = meta.width || 1536;

  // Don't upscale: only widths strictly smaller than the source, plus the
  // source's own width as a floor so at least one variant always exists.
  // Different source images end up with different width sets this way —
  // that's why render.js reads data/image-variants.js rather than
  // assuming 640/960/1536 always exist.
  const widths = WIDTHS.filter((w) => w < sourceWidth);
  if (widths.length === 0) widths.push(sourceWidth);

  for (const width of widths) {
    const avifPath = resolve(dir, `${base}-${width}.avif`);
    const webpPath = resolve(dir, `${base}-${width}.webp`);
    // Quality tuned high on purpose — this adds delivery variants, it
    // isn't meant to make the pictures look any different than they do
    // today, just serve a smaller one when the layout doesn't need full
    // resolution.
    await sharp(absPath).resize({ width, withoutEnlargement: true }).avif({ quality: 82, effort: 4 }).toFile(avifPath);
    await sharp(absPath).resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toFile(webpPath);
    console.log(`${relativePath} -> ${width}w (avif + webp)`);
  }

  return widths;
}

const manifest = {};
for (const source of SOURCES) {
  manifest[source] = await processImage(source);
}

writeFileSync(
  resolve(root, "data", "image-variants.js"),
  `// =====================================================
// Généré automatiquement par scripts/optimize-images.mjs le ${new Date().toISOString().slice(0, 10)}.
// Ne pas éditer à la main. Liste, pour chaque photo source, les largeurs
// AVIF/WebP réellement générées à côté d'elle (jamais de agrandissement
// au-delà de la résolution native — donc pas toujours 640/960/1536).
// =====================================================
window.SITE_IMAGE_VARIANTS = ${JSON.stringify(manifest, null, 2)};
`,
  "utf8",
);

console.log(`Done: ${SOURCES.length} source photo(s) processed.`);

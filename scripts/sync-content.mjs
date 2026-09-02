#!/usr/bin/env node
// =====================================================
// Content sync: csv/*.csv -> data/*.js
//
// Reads the CSV mirrors under csv/ (edited by hand, or via GitHub's web
// file editor by a non-technical editor) and regenerates the data/*.js
// files the site actually loads at runtime. Run via `npm run sync`, or
// automatically by .github/workflows/sync-content.yml on every push that
// touches csv/**.
//
// Do not hand-edit data/*.js — edit the CSVs and re-run this script.
// Do not rename the window.SITE_* globals — render.js references them by
// these exact names.
// =====================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// --- Minimal CSV parser: quoted fields, "" escaping, commas inside quotes.
// No multi-line-field support (not needed by this content) and no
// external dependency, matching the project's "static, no build step"
// stance for anything that ships to the browser (this script itself only
// runs in CI / on a developer's machine, never in production).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

function readCsvRecords(relativePath) {
  const raw = readFileSync(resolve(root, relativePath), "utf8").replace(/^﻿/, "");
  const rows = parseCsv(raw);
  const [header, ...body] = rows;
  return body
    .filter((row) => !String(row[0] || "").startsWith("##"))
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) => {
      const record = {};
      header.forEach((key, index) => {
        record[key.trim()] = (row[index] ?? "").trim();
      });
      return record;
    });
}

function writeDataFile(relativePath, globalName, value) {
  const banner = `// =====================================================
// Généré automatiquement par scripts/sync-content.mjs le ${new Date().toISOString().slice(0, 10)}.
// Ne pas éditer ce fichier à la main — modifier les fichiers dans csv/
// puis relancer "npm run sync". Ne pas renommer window.${globalName}.
// =====================================================
window.${globalName} = ${JSON.stringify(value, null, 2)};
`;
  writeFileSync(resolve(root, relativePath), banner, "utf8");
}

// --- Build SITE_PROJECTS (primary tier), with each project's media rows
// from project_media.csv nested under project.media, grouped by slug.
const projectRows = readCsvRecords("csv/projects.csv").sort(
  (a, b) => Number(a.order) - Number(b.order),
);
const mediaRows = readCsvRecords("csv/project_media.csv");

const projects = projectRows.map((row) => ({
  slug: row.slug,
  order: Number(row.order),
  number: String(row.order).padStart(2, "0"),
  indexTitle: row.indexTitle,
  indexMeta: row.indexMeta,
  panelType: row.panelType,
  h2Line1: row.h2Line1,
  h2Middle: row.h2Middle,
  h2Line2: row.h2Line2,
  description: row.description,
  heroImage: row.heroImage,
  galleryAriaLabel: row.galleryAriaLabel,
  footerTag1: row.footerTag1,
  footerTag2: row.footerTag2,
  footerTag3: row.footerTag3,
  media: mediaRows
    .filter((media) => media.slug === row.slug)
    .map((media) => ({
      slot: media.slot,
      stage: Number(media.stage) || 1,
      image: media.image,
      alt: media.alt,
      captionNumber: media.captionNumber,
      captionLabel: media.captionLabel,
    })),
}));

writeDataFile("data/projects.js", "SITE_PROJECTS", projects);

// --- Build SITE_ARCHIVE (secondary/carousel tier) ---
const archiveRows = readCsvRecords("csv/archive.csv").sort(
  (a, b) => Number(a.order) - Number(b.order),
);

const archive = archiveRows.map((row) => ({
  slug: row.slug,
  order: Number(row.order),
  number: String(row.order).padStart(2, "0"),
  title: row.title,
  type: row.type,
  image: row.image,
  alt: row.alt,
  relatedImages: row.relatedImages
    ? row.relatedImages.split(";").map((s) => s.trim()).filter(Boolean)
    : [],
}));

writeDataFile("data/archive.js", "SITE_ARCHIVE", archive);

console.log(`Synced ${projects.length} primary project(s) and ${archive.length} archive project(s).`);

import { defineConfig } from "vite";
import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// Loaded as plain (non-module) <script defer src="..."> tags — global-
// scope files that read/write window.SITE_* between each other rather
// than importing — so Vite's own HTML asset pipeline never sees them the
// way it sees <link rel="stylesheet"> or type="module" scripts, and they
// were previously just byte-copied under their own literal name. That
// meant, unlike styles.css (which Vite content-hashes into a new URL on
// every change), a change to any of these could sit behind a returning
// visitor's or Cloudflare's cache of the old file indefinitely with
// nothing about the URL to force a refetch. Hash each into dist under a
// new filename instead, same as Vite already does for CSS, and rewrite
// index.html's own <script src> tags (only place referencing them) to
// match.
const HASHED_RUNTIME_SCRIPTS = [
  "script.js",
  "render.js",
  "data/projects.js",
  "data/archive.js",
  "data/image-variants.js",
];

function copyStaticRuntime() {
  return {
    name: "copy-static-runtime",
    async closeBundle() {
      await mkdir(resolve("dist"), { recursive: true });
      await mkdir(resolve("dist", "data"), { recursive: true });

      const hashedNames = {};
      for (const file of HASHED_RUNTIME_SCRIPTS) {
        const content = await readFile(resolve(file));
        const hash = createHash("sha256").update(content).digest("hex").slice(0, 8);
        const dot = file.lastIndexOf(".");
        const hashedName = `${file.slice(0, dot)}-${hash}${file.slice(dot)}`;
        await copyFile(resolve(file), resolve("dist", hashedName));
        hashedNames[file] = hashedName;
      }

      await Promise.all(
        ["og.png", "robots.txt", "sitemap.xml"].map((file) => copyFile(resolve(file), resolve("dist", file))),
      );

      const indexPath = resolve("dist", "index.html");
      let html = await readFile(indexPath, "utf8");
      for (const [file, hashedName] of Object.entries(hashedNames)) {
        html = html.split(`src="./${file}"`).join(`src="./${hashedName}"`);
      }
      await writeFile(indexPath, html);

      // render.js resolves image paths at runtime from data/*.js (CSV-
      // sourced literal paths like "./assets/projects/cabane/x.webp") and
      // from data/image-variants.js's AVIF/WebP filenames — those are
      // never literal strings in index.html for Vite's own asset pipeline
      // to find and fingerprint, so its hashed copies alone leave every
      // data-driven <img>/<source> 404ing in production. Mirror the whole
      // assets/ tree verbatim (unhashed) so those runtime-built paths
      // always resolve, alongside Vite's separate hashed copies for the
      // images referenced directly in the HTML source.
      await cp(resolve("assets"), resolve("dist", "assets"), { recursive: true });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [copyStaticRuntime()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve("index.html"),
        legal: resolve("mentions-legales.html"),
      },
    },
  },
});

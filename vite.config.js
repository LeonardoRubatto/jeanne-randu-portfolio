import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import { copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function copyStaticRuntime() {
  return {
    name: "copy-static-runtime",
    async closeBundle() {
      await mkdir(resolve("dist"), { recursive: true });
      await mkdir(resolve("dist", "server"), { recursive: true });
      await mkdir(resolve("dist", "data"), { recursive: true });
      await Promise.all(
        [
          "script.js",
          "render.js",
          "data/projects.js",
          "data/archive.js",
          "data/image-variants.js",
          "og.png",
          "robots.txt",
          "sitemap.xml",
        ].map((file) => copyFile(resolve(file), resolve("dist", file))),
      );
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
      await writeFile(
        resolve("dist", "server", "index.js"),
        'export default { fetch(request, env) { return env.ASSETS.fetch(request); } };\n',
        "utf8",
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [sites(), copyStaticRuntime()],
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

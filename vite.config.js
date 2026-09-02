import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
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
          "og.png",
          "robots.txt",
          "sitemap.xml",
        ].map((file) => copyFile(resolve(file), resolve("dist", file))),
      );
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

import { build } from "esbuild";
import { mkdir, writeFile, stat, rm, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const generated = resolve("public/offline-assets");
if (generated !== resolve(process.cwd(), "public", "offline-assets"))
  throw Error("Unexpected offline output path");
await rm(generated, { recursive: true, force: true });
const result = await build({
  entryPoints: ["components/offline/offline-reader.tsx"],
  outdir: "public/offline-assets",
  bundle: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  target: ["es2022"],
  entryNames: "reader-[hash]",
  assetNames: "fonts/[name]-[hash]",
  loader: { ".woff": "file", ".woff2": "file", ".ttf": "file" },
  metafile: true,
  plugins: [
    {
      name: "offline-woff2-fonts",
      setup(api) {
        api.onLoad({ filter: /katex\.min\.css$/ }, async (args) => ({
          contents: (await readFile(args.path, "utf8")).replace(/src:([^;]+);/g, (all, sources) => {
            const modern = sources.split(",").find((part) => part.includes(".woff2"));
            return modern ? `src:${modern};` : all;
          }),
          loader: "css",
          resolveDir: dirname(args.path),
        }));
      },
    },
  ],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
const paths = Object.keys(result.metafile.outputs);
const js = paths.find((p) => p.endsWith(".js")),
  css = paths.find((p) => p.endsWith(".css"));
if (!js || !css) throw Error("Offline reader bundle is incomplete");
const url = (p) => "/" + p.replaceAll("\\", "/").replace(/^public\//, "");
const assets = paths.map(url);
let bytes = 0;
for (const path of paths) bytes += (await stat(path)).size;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#285849"><link rel="manifest" href="/manifest.webmanifest"><title>Offline library · Vela</title><link rel="stylesheet" href="${url(css)}"></head><body><div id="offline-root"><h1>Vela offline library</h1><p>If the reader does not load, connect once and save a lesson using its Lesson tools menu.</p></div><script type="module" src="${url(js)}"></script></body></html>`;
await writeFile("public/offline.html", html);
await writeFile(
  "public/offline-assets/manifest.json",
  JSON.stringify({ version: 2, bytes, assets: ["/offline.html", ...assets] }),
);
console.log(
  `Offline reader: ${assets.length} public assets, ${(bytes / 1_000_000).toFixed(2)} MB; no private lesson data.`,
);

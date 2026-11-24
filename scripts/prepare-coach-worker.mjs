import { transform } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
// Transform a closed list of project files. Node resolves the pinned runtime packages;
// avoiding bundler ancestry scans also works inside restricted Windows workspaces.
for (const source of [
  "scripts/coach-cas-worker.ts",
  "lib/math-practice/checker.ts",
  "lib/math-practice/parser.ts",
  "lib/math-practice/matrix.ts",
  "lib/math-practice/quantity.ts",
  "lib/math-practice/types.ts",
]) {
  const target = join("generated/coach-cas", source.replace(/\.ts$/, ".js"));
  await mkdir(dirname(target), { recursive: true });
  const result = await transform(await readFile(source, "utf8"), {
    loader: "ts",
    format: "cjs",
    target: "node22",
    sourcefile: source,
  });
  await writeFile(target, result.code);
}
await writeFile("generated/coach-cas/package.json", '{"type":"commonjs"}\n');

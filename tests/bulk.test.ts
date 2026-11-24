import { test } from "node:test";
import assert from "node:assert/strict";
import { pageJobs, validatePage, pageDocument, checkLimitTables } from "../lib/content/bulk";
import { structuredDocumentSchema } from "../lib/content/structured";
import { deduplicateReadings } from "../lib/study/readings";
import { sourceFigure } from "../lib/study/figure-source";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sha = "a".repeat(64);
const segment = (unitCode: string, sourceId: string, start: number, end: number) => ({ unitCode, sourceId, sha256: sha, pdfStart: start, pdfEnd: end, text: "", pages: [] });
test("bulk plan covers every physical page, deduplicates overlap and interleaves units", () => {
  const jobs = pageJobs({ files: [], documents: [segment("U1", "guide", 10, 12), segment("U1", "guide", 12, 13), segment("U2", "guide", 20, 21), segment("U1", "stewart", 41, 42)] });
  assert.equal(jobs.length, 8);
  assert.deepEqual(jobs.slice(0, 4).map(job => job.key), ["guide:10", "guide:20", "guide:11", "guide:21"]);
  assert.throws(() => pageJobs({ files: [], documents: [segment("U1", "guide", 10, 11), segment("U2", "guide", 11, 12)] }));
});
test("bulk quality gates reject damaged math, truncation and repetition without using raw text as content", () => {
  assert.throws(() => validatePage("$unclosed", "source", 0));
  assert.throws(() => validatePage("A short surviving passage.", "Mathematics ".repeat(200), 0));
  assert.throws(() => validatePage(("This is an unusually long sentence repeated by a broken model.\n").repeat(12), "", 0));
  assert.equal(validatePage(String.raw`The expression $\frac{x^2}{2}$ is an antiderivative.`, "", 0).formulas, 1);
});
test("source figures accept only hashed PNG assets and preserve page provenance", () => {
  const job = { key: "guide:14", source: "guide" as const, page: 14, sha256: sha, unitCode: "U1", rawText: "" };
  const doc = pageDocument(job, 144, [{ id: "picture", type: "figure", asset: sha + ".png", caption: "Source graph", sourcePage: 14 }]);
  assert.equal(doc.parser.review, "machine");
  assert.equal(structuredDocumentSchema.safeParse({ ...doc, blocks: [{ ...doc.blocks[0], asset: "../../.env" }] }).success, false);
  assert.equal(structuredDocumentSchema.safeParse({ ...doc, blocks: [{ ...doc.blocks[0], sourcePage: 15 }] }).success, false);
});
test("recognized limit tables catch OCR digit errors without silently correcting the source", () => {
  const header = String.raw`| $x$ | $g(x)=\frac{x^2 - 5}{x - 2}$ |` + "\n|---|---|\n";
  assert.doesNotThrow(() => checkLimitTables(header + "| 2.1 | -5.9 |\n| 1.9999 | 10,003.9999 |"));
  assert.throws(() => checkLimitTables(header + "| 2.1 | -5.1 |"), /inconsistent/);
});
test("reader deduplication retains citation IDs across embedding providers and sorts source pages", () => {
  const source = (page: number) => pageDocument({ key: `guide:${page}`, source: "guide", page, sha256: sha, unitCode: "U1", rawText: "" }, 144, [{ id: "text", type: "markdown", markdown: "Reading" }]);
  const documents = deduplicateReadings([{ id: "late", title: "page 20", text: "Reading", structuredContent: source(20) }, { id: "local", title: "page 14", text: "Reading", structuredContent: source(14) }, { id: "cloud", title: "page 14", text: "Reading", structuredContent: source(14) }]);
  assert.equal(documents.length, 2);
  assert.deepEqual(documents[0].ingestionIds, ["local", "cloud"]);
});
test("figure serving rejects traversal, missing files and mismatched content hashes", async () => {
  const folder = await mkdtemp(join(tmpdir(), "lms-figures-"));
  const previous = process.env.MATH_ASSET_DIR; process.env.MATH_ASSET_DIR = folder;
  let assetPath: string | undefined;
  try {
    assert.equal((await sourceFigure("../../.env")).status, 404);
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXf8AAAAASUVORK5CYII=", "base64");
    const name = createHash("sha256").update(bytes).digest("hex") + ".png";
    assetPath = join(folder, name);
    await writeFile(assetPath, bytes);
    assert.equal((await sourceFigure(name)).status, 200);
    await writeFile(join(folder, name), Buffer.from("not an image"));
    assert.equal((await sourceFigure(name)).status, 409);
  } finally { if (previous === undefined) delete process.env.MATH_ASSET_DIR; else process.env.MATH_ASSET_DIR = previous; if (assetPath) await unlink(assetPath); await rmdir(folder); }
});

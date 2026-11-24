import "dotenv/config";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile, mkdir, rename, open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Prisma } from "@prisma/client";
import { BulkDatabase } from "./bulk-database";
import { MathWorker } from "./math-worker";
import { storeMarkerFigure, type MarkerFigure } from "./store-marker-figure";
import { pageJobs, pageDocument, validatePage, type PageJob, type ScopePlan } from "../lib/content/bulk";
import { structuredDocumentSchema, documentSourceUrl, type StructuredDocument } from "../lib/content/structured";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { embedTokens, assertVectors, type Embedder } from "../lib/ingest/embeddings";
import { getAIConfig } from "../lib/ai/config";

type Provider = "ollama" | "cloudflare";
type Entry = { status: "pending" | "converted" | "needs-review"; document?: string; dpi?: number; seconds?: number; formulas?: number; figures?: number; error?: string; providers: Partial<Record<Provider, { ingestionId: string; chunkCount: number }>> };
type State = { version: 1; scope: string; startedAt: string; updatedAt: string; jobs: Record<string, Entry> };
const root = resolve("../work/math-parser/bulk");
const statePath = join(root, "state.json");
const lockPath = join(root, "runner.lock");
const database = new BulkDatabase();
const worker = new MathWorker();
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
let stopping = false;
let cloudflareRetryAt = 0;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

async function atomic(path: string, value: unknown) {
  const temporary = path + ".tmp";
  if (path === statePath) {
    try { const previous = await readFile(path, "utf8"); JSON.parse(previous); await writeFile(path + ".bak", previous, { flush: true }); } catch { /* Reconstruct absent/damaged checkpoints from published records and page caches. */ }
  }
  await writeFile(temporary, JSON.stringify(value, null, 2), { flush: true });
  await rename(temporary, path);
}
async function exists(path: string) { try { await readFile(path); return true; } catch { return false; } }
const repository = createIngestionRepository(database);

// A database retry must not pay the embedding CPU/network cost twice. Cache keys
// include text and the complete provider/model/dimensions/endpoint space.
const cachedEmbed: Embedder = async (inputs, context) => {
  const space = getAIConfig().embeddingSpace;
  const output: number[][] = new Array(inputs.length);
  const missing: number[] = [];
  for (let index = 0; index < inputs.length; index++) {
    const key = digest(JSON.stringify({ space, text: context!.texts[index] }));
    try { output[index] = JSON.parse(await readFile(join(root, "embeddings", key + ".json"), "utf8")); assertVectors([output[index]], 1, space.dimensions); }
    catch { missing.push(index); }
  }
  if (missing.length) {
    const vectors = await embedTokens(missing.map(index => inputs[index]), { ...context!, texts: missing.map(index => context!.texts[index]) });
    for (const [offset, index] of missing.entries()) {
      output[index] = vectors[offset];
      const key = digest(JSON.stringify({ space, text: context!.texts[index] }));
      await atomic(join(root, "embeddings", key + ".json"), vectors[offset]);
    }
  }
  return output;
};

async function prepare(job: PageJob, entry: Entry): Promise<StructuredDocument | null> {
  if (entry.document) {
    try { const document = structuredDocumentSchema.parse(JSON.parse(await readFile(entry.document, "utf8"))); if (document.source.sha256 !== job.sha256 || document.source.document !== job.source || document.source.pageStart !== job.page || document.source.pageEnd !== job.page) throw new Error("Cached source changed"); if (document.parser.review === "machine") validatePage(document.blocks.filter(block => block.type === "markdown").map(block => block.markdown).join("\n\n"), job.rawText, document.blocks.filter(block => block.type === "figure").length); return document; } catch { /* Recreate a missing or stale cache. */ }
  }
  for (const dpi of [144, 192]) {
    const folder = join(root, "pages", job.sha256.slice(0, 16), String(job.page).padStart(5, "0"), String(dpi));
    await mkdir(folder, { recursive: true });
    try {
      if (!await exists(join(folder, "result.json"))) await worker.run({ pdf: sourcePath(job.source), page: job.page, dpi, output: folder });
      const raw = JSON.parse(await readFile(join(folder, "result.json"), "utf8")) as { page: number; dpi: number; markdown: string; images: MarkerFigure[]; seconds: number };
      if (raw.page !== job.page || raw.dpi !== dpi) throw new Error("Cached OCR page/settings mismatch");
      const checked = validatePage(raw.markdown, job.rawText, raw.images.length);
      const assets = new Map<string, Awaited<ReturnType<typeof storeMarkerFigure>>>();
      for (const image of raw.images) {
        assets.set(image.reference, await storeMarkerFigure(folder, join(root, "assets"), image));
      }
      const blocks: StructuredDocument["blocks"] = [];
      let cursor = 0;
      const emitted = new Set<string>();
      for (const match of checked.markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        const before = checked.markdown.slice(cursor, match.index).trim();
        if (before) blocks.push({ id: `text-${blocks.length}`, type: "markdown", markdown: before });
        const asset = assets.get(match[1]);
        if (asset) { blocks.push({ id: `figure-${blocks.length}`, type: "figure", ...asset, caption: `Source figure from ${job.source === "guide" ? "UNISA guide" : "Stewart"}, PDF page ${job.page}`, sourcePage: job.page }); emitted.add(asset.asset); }
        cursor = match.index! + match[0].length;
      }
      const after = checked.markdown.slice(cursor).trim();
      if (after) blocks.push({ id: `text-${blocks.length}`, type: "markdown", markdown: after });
      for (const asset of assets.values()) if (!emitted.has(asset.asset)) blocks.push({ id: `figure-${blocks.length}`, type: "figure", ...asset, caption: `Source figure, PDF page ${job.page}`, sourcePage: job.page });
      const document = pageDocument(job, dpi, blocks);
      const path = join(folder, "structured.json");
      await atomic(path, document);
      Object.assign(entry, { document: path, dpi, seconds: raw.seconds, formulas: checked.formulas, figures: assets.size, error: undefined });
      return document;
    } catch (error) {
      entry.error = error instanceof Error ? error.message.slice(0, 1000) : "Conversion failed";
      console.log(`RETRY/REVIEW ${job.key} at ${dpi} DPI: ${entry.error}`);
    }
  }
  entry.status = "needs-review";
  return null;
}

const sourcePath = (source: string) => join(process.env.MAT1512_SOURCE_DIR || "C:/Users/sizwe/Documents/LMS/Mat1512", source === "guide" ? "Mat1512-guide.pdf" : "Stewart.pdf");
async function main() {
  for (const folder of [root, join(root, "assets"), join(root, "embeddings"), join(root, "existing")]) await mkdir(folder, { recursive: true });
  const lock = await open(lockPath, "wx").catch(() => { throw new Error("A bulk runner lock exists. Check bulk:status; use bulk:resume only after confirming the previous runner has stopped."); });
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  await lock.close();
  try {
    const plan = JSON.parse(await readFile(resolve("../work/mat1512/ingestion-plan.json"), "utf8")) as ScopePlan;
    if (plan.files.length !== 2 || !plan.files.some(file => file.id === "guide") || !plan.files.some(file => file.id === "stewart")) throw new Error("Both original PDF manifests are required");
    const jobs = pageJobs(plan);
    const scope = digest(JSON.stringify(jobs.map(({ key, sha256, unitCode }) => ({ key, sha256, unitCode }))));
    for (const source of plan.files) {
      const hash = createHash("sha256"); for await (const bytes of createReadStream(sourcePath(source.id))) hash.update(bytes);
      if (hash.digest("hex") !== source.sha256) throw new Error(`Source PDF hash changed: ${source.id}`);
    }
    let state: State;
    let rebuilding = false;
    try { state = JSON.parse(await readFile(statePath, "utf8")); } catch {
      try { state = JSON.parse(await readFile(statePath + ".bak", "utf8")); }
      catch { rebuilding = true; state = { version: 1, scope, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), jobs: {} }; }
    }
    if (state.scope !== scope) throw new Error("Source scope changed; preserve the old checkpoints and create a new conversion workspace before continuing.");
    for (const job of jobs) state.jobs[job.key] ??= { status: "pending", providers: {} };
    // Preserve the source-compared pilot and any completed pages after a restart.
    const prior = await database.priorReadings();
    for (const row of prior) {
      const document = structuredDocumentSchema.safeParse(row.structuredContent);
      if (!document.success || document.data.source.pageStart !== document.data.source.pageEnd) continue;
      const source = document.data.source;
      const job = jobs.find(job => job.key === `${source.document}:${source.pageStart}` && job.sha256 === source.sha256);
      if (job && ["ollama", "cloudflare"].includes(row.embeddingProvider)) {
        await database.repairLinks(row.id, documentSourceUrl(document.data));
        state.jobs[job.key].providers[row.embeddingProvider as Provider] = { ingestionId: row.id, chunkCount: row.chunkCount }; state.jobs[job.key].status = "converted";
        if (!state.jobs[job.key].document) { const path = join(root, "existing", `${job.source}-${job.page}.json`); await atomic(path, document.data); state.jobs[job.key].document = path; }
      }
    }
    const units = await database.units();
    if (units.length !== 5) throw new Error("All five MAT1512 curriculum mappings are required");
    const mappings = new Map(units.map(unit => [unit.code, { studyUnitId: unit.id, learningOutcomeId: unit.learningOutcomeId, assessmentCriterionId: unit.assessmentCriterionId }]));
    const moduleId = units[0].moduleId;
    if (rebuilding) {
      const [priorProgress] = await database.query<{ conversion: { reviewPages?: { source: string; page: number; reason?: string }[] } | null }>(Prisma.sql`SELECT "metadata"->'conversion' AS conversion FROM "Module" WHERE "id"=${moduleId}`);
      for (const review of priorProgress?.conversion?.reviewPages ?? []) {
        const entry = state.jobs[`${review.source}:${review.page}`];
        // Infrastructure failures are retryable after restart. Preserve genuine
        // content-quality holds recovered from the server-side progress copy.
        if (entry && entry.status !== "converted" && !/exceeded 15 minutes|Only one OCR|worker exited|database|fetch failed/i.test(review.reason ?? "")) {
          entry.status = "needs-review"; entry.error = review.reason;
        }
      }
    }
    let lastMetadata = 0;
    const report = async (final = false) => {
      state.updatedAt = new Date().toISOString(); await atomic(statePath, state);
      const byUnit = Object.fromEntries(units.map(unit => [unit.code, { total: jobs.filter(job => job.unitCode === unit.code).length, converted: 0, needsReview: 0 }]));
      for (const job of jobs) { if (state.jobs[job.key].status === "converted") byUnit[job.unitCode].converted++; if (state.jobs[job.key].status === "needs-review") byUnit[job.unitCode].needsReview++; }
      const converted = jobs.filter(job => state.jobs[job.key].status === "converted").length;
      const review = jobs.filter(job => state.jobs[job.key].status === "needs-review");
      // The first measurement includes native model startup. Use recent warm
      // pages for an approximate OCR-only estimate, not a completion promise.
      const timed = Object.values(state.jobs).filter(entry => entry.seconds).slice(1).slice(-30);
      const meanSeconds = timed.length ? timed.reduce((sum, entry) => sum + entry.seconds!, 0) / timed.length : 104;
      const summary = { updatedAt: state.updatedAt, status: final ? converted === jobs.length ? "complete" : "paused-or-needs-review" : "running", total: jobs.length, converted, needsReview: review.length, remaining: jobs.length - converted - review.length, estimatedHoursRemaining: Math.round((jobs.length - converted - review.length) * meanSeconds / 3600 * 10) / 10, meanSeconds: Math.round(meanSeconds), providers: { ollama: jobs.filter(job => state.jobs[job.key].providers.ollama).length, cloudflare: jobs.filter(job => state.jobs[job.key].providers.cloudflare).length }, units: byUnit, reviewPages: review.map(job => ({ source: job.source, page: job.page, unit: job.unitCode, reason: state.jobs[job.key].error })) };
      await atomic(resolve("bulk-conversion-status.json"), summary);
      if (final || Date.now() - lastMetadata > 60_000) {
        try { await database.query(Prisma.sql`UPDATE "Module" SET "metadata"=jsonb_set(COALESCE("metadata", '{}'::jsonb), '{conversion}', ${JSON.stringify(summary)}::jsonb) WHERE "id"=${moduleId}`); lastMetadata = Date.now(); } catch { /* Local progress remains durable if Neon is briefly unavailable. */ }
      }
      console.log(`PROGRESS ${converted}/${jobs.length}; review=${review.length}; Ollama=${summary.providers.ollama}; Cloudflare=${summary.providers.cloudflare}`);
    };
    await report();
    const limit = Number(process.argv.find(arg => arg.startsWith("--limit="))?.split("=")[1] || Infinity);
    const pending = jobs.filter(job => {
      const entry = state.jobs[job.key];
      return !(entry.providers.ollama && entry.providers.cloudflare) && (entry.status !== "needs-review" || process.argv.includes("--retry-review"));
    });
    const prepareJob = async (job: PageJob) => job.source === "guide" && job.page === 14
      ? structuredDocumentSchema.parse(JSON.parse(await readFile(resolve("content/mat1512/guide-page14-marker.json"), "utf8")))
      : prepare(job, state.jobs[job.key]);
    if (process.argv.includes("--retry-review")) pending.sort((a, b) => Number(state.jobs[b.key].status === "needs-review") - Number(state.jobs[a.key].status === "needs-review"));
    let prepared: Promise<StructuredDocument | null> | undefined;
    for (let index = 0; index < pending.length && index < limit; index++) {
      if (stopping || await exists(join(root, "pause.request"))) break;
      const job = pending[index];
      const entry = state.jobs[job.key];
      const document = await (prepared ?? prepareJob(job));
      prepared = undefined;
      // One OCR worker overlaps with one publisher. Provider publishing stays
      // sequential because AI_PROVIDER selects the embedding configuration.
      if (index + 1 < pending.length && index + 1 < limit && !stopping && !await exists(join(root, "pause.request"))) {
        prepared = prepareJob(pending[index + 1]);
        // Defer any fatal filesystem error until this page is checkpointed.
        void prepared.catch(() => {});
      }
      if (document) {
        for (const provider of ["ollama", "cloudflare"] as Provider[]) {
          if (entry.providers[provider] || (provider === "cloudflare" && Date.now() < cloudflareRetryAt)) continue;
          process.env.AI_PROVIDER = provider;
          try {
            const result = await ingest({ moduleCode: "MAT1512", ...mappings.get(job.unitCode)!, sourceName: `Marker OCR ${job.source} · PDF ${job.page}–${job.page}`, structuredContent: document }, repository, cachedEmbed);
            await database.repairLinks(result.ingestionId, documentSourceUrl(document));
            entry.providers[provider] = { ingestionId: result.ingestionId, chunkCount: result.chunkCount };
            entry.status = "converted";
          } catch (error) { entry.error = `${provider}: ${error instanceof Error ? error.message : "embedding unavailable"}`; console.log(`PENDING ${job.key}: ${entry.error}`); if (provider === "cloudflare") cloudflareRetryAt = Date.now() + 15 * 60_000; }
        }
      }
      await report();
    }
    // A pause finishes the page already being OCR'd and checkpoints it for
    // reuse; it never kills a page halfway through or leaves a rejected promise.
    if (prepared) await prepared;
    await report(true);
  } finally { worker.stop(); await database.disconnect(); await unlink(lockPath).catch(() => {}); }
}
main().catch(error => { console.error(error.message); worker.stop(); process.exitCode = 1; });

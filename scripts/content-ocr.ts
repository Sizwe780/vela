import "dotenv/config";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { validatePage } from "../lib/content/bulk";
import {
  checkedUnit,
  loadFactoryManifest,
  type FactoryManifest,
} from "../lib/content/factory-evidence";
import { validateFactoryMath } from "../lib/content/factory-markdown";
import { normalizeMarkerArtifacts } from "../lib/content/marker-normalize";
import { structuredDocumentSchema, type StructuredDocument } from "../lib/content/structured";
import { options, readJSON, verifyPDFs } from "./content-factory-files";
import { atomicJSON, batchPlanSchema } from "./content-factory-batch";
import { MathWorker } from "./math-worker";
import { storeMarkerFigure } from "./store-marker-figure";

const resultSchema = z.object({
  page: z.number(),
  dpi: z.number(),
  markdown: z.string(),
  images: z.array(
    z.object({
      reference: z.string(),
      file: z.string(),
      vector: z.string().optional(),
      vectorError: z.string().optional(),
    }),
  ),
});

async function convertPage(
  worker: MathWorker,
  root: string,
  pdf: string,
  source: FactoryManifest["sources"][number],
  page: number,
) {
  const dir = join(root, "pages", source.sha256, source.id, String(page));
  const assets = join(root, "figures");
  const checkpoint = join(dir, "structured.json");
  try {
    const saved = structuredDocumentSchema.parse(await readJSON(checkpoint));
    if (
      saved.source.document === source.id &&
      saved.source.sha256 === source.sha256 &&
      saved.source.pageStart === page &&
      saved.source.pageEnd === page &&
      saved.parser.profile?.startsWith("content-factory-ocr-v1")
    ) {
      for (const block of saved.blocks) {
        if (block.type !== "figure") continue;
        await stat(join(assets, block.asset));
        if (block.vectorAsset) await stat(join(assets, block.vectorAsset));
      }
      return { status: "reused", document: checkpoint };
    }
  } catch {
    // Missing or incomplete local results go through OCR again.
  }

  let failure: unknown;
  for (const dpi of [144, 192]) {
    try {
      const output = join(dir, String(dpi));
      await mkdir(output, { recursive: true });
      await mkdir(assets, { recursive: true });
      await worker.run({ pdf, page, dpi, output });
      const raw = resultSchema.parse(await readJSON(join(output, "result.json")));
      if (raw.page !== page || raw.dpi !== dpi)
        throw new Error("Marker checkpoint identity mismatch.");
      const { markdown } = validatePage(
        normalizeMarkerArtifacts(raw.markdown),
        "",
        raw.images.length,
      );
      const blocks: StructuredDocument["blocks"] = [];
      const references = new Set(raw.images.map((image) => image.reference));
      const text = markdown.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_match, reference: string) => {
        if (!references.has(reference)) throw new Error("A referenced figure is missing.");
        return "";
      });
      if (text.trim()) {
        validateFactoryMath(text);
        blocks.push({ type: "markdown", id: "reading", markdown: text });
      }
      for (const image of raw.images) {
        blocks.push({
          type: "figure",
          id: "figure-" + blocks.length,
          ...(await storeMarkerFigure(output, assets, image)),
          caption: "Source illustration, PDF page " + page,
          sourcePage: page,
        });
      }
      const document = structuredDocumentSchema.parse({
        version: 1,
        parser: {
          name: "marker",
          version: "2.1.0",
          review: "machine",
          profile: "content-factory-ocr-v1; dpi=" + dpi,
        },
        source: { document: source.id, sha256: source.sha256, pageStart: page, pageEnd: page },
        blocks,
      });
      await atomicJSON(checkpoint, document);
      return { status: "awaiting-review", document: checkpoint };
    } catch (error) {
      failure = error;
    }
  }
  throw failure;
}

async function main() {
  const args = options();
  if (!args.plan) throw new Error("Provide --plan=<batch JSON>.");
  if (args.run && args.run !== "true" && args.run !== "false")
    throw new Error("Use --run=true to start local OCR.");
  const planPath = resolve(args.plan);
  const plan = batchPlanSchema.parse(await readJSON(planPath));
  const output = resolve("../work/content-factory/ocr");
  const worker = new MathWorker(undefined, join(output, "profile"));
  const maxPages = Number(args["max-pages"] ?? 20_000);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 20_000)
    throw new Error("Choose --max-pages between 1 and 20000.");
  let failed = 0;
  let convertedOrHeld = 0;
  const seen = new Set<string>();
  function report(record: object) {
    console.log(JSON.stringify(record));
  }
  function held(identity: object, error: unknown) {
    failed++;
    report({
      ...identity,
      status: "held",
      issue: error instanceof Error ? error.message.slice(0, 400) : "OCR failed.",
    });
  }
  try {
    for (const module of plan.modules) {
      const sourceRoot = resolve(dirname(planPath), module.sourceRoot);
      let manifest: FactoryManifest;
      try {
        manifest = await loadFactoryManifest(module.code);
        if (manifest.scope === "provisional" && !module.allowProvisional)
          throw new Error("Provisional scope requires explicit permission for private draft work.");
        await verifyPDFs(manifest, sourceRoot, false);
      } catch (error) {
        held({ module: module.code }, error);
        continue;
      }
      for (const unit of module.units) {
        const id = { module: module.code, unit: unit.code };
        try {
          const mapping = checkedUnit(manifest, unit.code);
          if (!mapping.pages.length) throw new Error("Map physical PDF pages before starting OCR.");
          if (args.run !== "true") {
            report({ ...id, status: "ready", pageRanges: mapping.pages });
            continue;
          }
          for (const range of mapping.pages) {
            const source = manifest.sources.find((entry) => entry.id === range.sourceId)!;
            for (let page = range.first; page <= range.last; page++) {
              const key = `${source.sha256}:${source.id}:${page}`;
              const pageId = { ...id, source: source.id, page };
              if (seen.has(key)) continue;
              seen.add(key);
              if (convertedOrHeld >= maxPages) {
                report({ status: "limit-reached", newPages: convertedOrHeld });
                if (failed) process.exitCode = 1;
                return;
              }
              try {
                const result = await convertPage(
                  worker,
                  output,
                  resolve(sourceRoot, source.filename),
                  source,
                  page,
                );
                if (result.status !== "reused") convertedOrHeld++;
                report({ ...pageId, ...result });
              } catch (error) {
                convertedOrHeld++;
                held(pageId, error);
              }
            }
          }
        } catch (error) {
          held(id, error);
        }
      }
    }
    report({ status: "finished", newPages: convertedOrHeld, held: failed });
    if (failed) process.exitCode = 1;
  } finally {
    worker.stop();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "OCR preparation failed.");
  process.exitCode = 1;
});

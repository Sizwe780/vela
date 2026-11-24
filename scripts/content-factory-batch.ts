import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  artifactSchema,
  manufacture,
  prepareManufacture,
  type GenerateStep,
} from "../lib/content/factory";
import {
  checkedUnit,
  hashSchema,
  hashValue,
  reviewedEvidence,
  type FactoryManifest,
} from "../lib/content/factory-evidence";
import { readJSON } from "./content-factory-files";

const code = z.string().regex(/^[A-Z0-9-]{2,40}$/);
const path = z.string().trim().min(1).max(1024);
export const batchPlanSchema = z
  .object({
    modules: z
      .array(
        z
          .object({
            code,
            sourceRoot: path,
            allowProvisional: z.boolean().default(false),
            units: z
              .array(z.object({ code, evidence: path }).strict())
              .min(1)
              .max(30),
          })
          .strict(),
      )
      .min(1)
      .max(40),
  })
  .strict()
  .superRefine(({ modules }, ctx) => {
    if (new Set(modules.map((module) => module.code)).size !== modules.length)
      ctx.addIssue({ code: "custom", message: "List each module once." });
    for (const module of modules)
      if (new Set(module.units.map((unit) => unit.code)).size !== module.units.length)
        ctx.addIssue({ code: "custom", message: "List each unit once in " + module.code + "." });
  });

type Mode = { provider: "ollama" | "cloudflare"; model: string; generate: GenerateStep };
type Failure = "blocked" | "generation-failed" | "audit-failed";
export type BatchResult =
  | { module: string; unit: string; status: Failure; issue: string; artifact?: string }
  | { module: string; unit: string; status: "ready" | "generated" | "reused"; artifact?: string };

const checkpointSchema = z.object({ input: hashSchema, artifactHash: hashSchema }).strict();

export async function atomicJSON(file: string, value: unknown) {
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), { flag: "wx", flush: true });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

function describe(error: unknown) {
  return (error instanceof Error ? error.message : "Unexpected failure.")
    .replace(/https?:\/\/\S+/g, "[endpoint]")
    .slice(0, 400);
}

export async function runContentBatch(
  input: unknown,
  options: {
    root: string;
    drafts: string;
    workers: number;
    provider: "ollama" | "cloudflare";
    mode?: Mode;
  },
  dependencies: {
    loadManifest: (code: string) => Promise<FactoryManifest>;
    verifySources: (manifest: FactoryManifest, root: string) => Promise<void>;
    report?: (result: BatchResult) => void;
  },
) {
  const plan = batchPlanSchema.parse(input);
  const results: BatchResult[] = [];
  const report = (result: BatchResult) => {
    results.push(result);
    dependencies.report?.(result);
  };
  const { mode } = options;
  if (!Number.isSafeInteger(options.workers) || options.workers < 1 || options.workers > 3)
    throw new Error("Choose one to three workers.");
  if (mode && mode.provider !== options.provider)
    throw new Error("Preflight and generation must use the same provider.");

  for (const module of plan.modules) {
    let manifest: FactoryManifest;
    try {
      manifest = await dependencies.loadManifest(module.code);
      if (manifest.moduleCode !== module.code) throw new Error("Manifest module code mismatch.");
      if (manifest.scope === "provisional" && !module.allowProvisional)
        throw new Error("Provisional mapping requires explicit permission for private draft work.");
      await dependencies.verifySources(manifest, resolve(options.root, module.sourceRoot));
    } catch (error) {
      for (const unit of module.units)
        report({ module: module.code, unit: unit.code, status: "blocked", issue: describe(error) });
      continue;
    }

    const manifestHash = hashValue(manifest);
    let next = 0;
    async function worker() {
      for (;;) {
        const unit = module.units[next++];
        if (!unit) return;
        const id = { module: module.code, unit: unit.code };
        let evidence;
        let specHash: string;
        try {
          checkedUnit(manifest, unit.code);
          evidence = reviewedEvidence(
            manifest,
            unit.code,
            await readJSON(resolve(options.root, unit.evidence)),
          );
          if (
            options.provider === "cloudflare" &&
            evidence.included.some((item) => !item.remoteProcessing)
          )
            throw new Error(
              "The manifest does not permit remote processing for this unit's evidence.",
            );
          const prepared = await prepareManufacture(
            manifest,
            unit.code,
            evidence.included,
            evidence.skipped,
          );
          specHash = prepared.spec.hash;
        } catch (error) {
          report({ ...id, status: "blocked", issue: describe(error) });
          continue;
        }
        if (!mode) {
          report({ ...id, status: "ready" });
          continue;
        }

        try {
          const key = hashValue({
            version: 1,
            module: manifest.moduleCode,
            unit: unit.code,
            manifestHash,
            specHash,
            provider: mode.provider,
            model: mode.model,
            evidence: evidence.included.map((item) => item.ref),
            exclusions: evidence.skipped,
          });
          const directory = join(options.drafts, manifest.moduleCode, unit.code);
          await mkdir(directory, { recursive: true });
          const artifact = join(directory, key + ".json");
          const audit = join(directory, key + ".audit.json");
          const checkpoint = join(directory, key + ".passed.json");
          try {
            const saved = checkpointSchema.parse(await readJSON(checkpoint));
            const draft = artifactSchema.parse(await readJSON(artifact));
            const savedAudit = z.object({ passed: z.literal(true) }).parse(await readJSON(audit));
            if (
              savedAudit.passed &&
              saved.input === key &&
              draft.moduleCode === manifest.moduleCode &&
              draft.inventory.unitCode === unit.code &&
              draft.manifestHash === manifestHash &&
              draft.specHash === specHash &&
              saved.artifactHash === hashValue(draft)
            ) {
              report({ ...id, status: "reused", artifact });
              continue;
            }
          } catch {
            // A missing, interrupted, or invalid checkpoint is regenerated.
          }
          await rm(checkpoint, { force: true });
          const generated = await manufacture(
            manifest,
            unit.code,
            evidence.included,
            mode.generate,
            evidence.skipped,
          );
          if (generated.artifact.specHash !== specHash)
            throw new Error("The module specification changed during generation. Rerun this unit.");
          await atomicJSON(artifact, generated.artifact);
          await atomicJSON(audit, generated.audit);
          if (!generated.audit.passed) {
            report({
              ...id,
              status: "audit-failed",
              issue: "See the accompanying audit report.",
              artifact,
            });
            continue;
          }
          await atomicJSON(checkpoint, { input: key, artifactHash: hashValue(generated.artifact) });
          report({ ...id, status: "generated", artifact });
        } catch (error) {
          report({ ...id, status: "generation-failed", issue: describe(error) });
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(options.workers, module.units.length) }, worker),
    );
  }
  return results;
}

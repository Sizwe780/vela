import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { assertCurriculumScope } from "./curriculum-scope";
import { validateFactoryMath } from "./factory-markdown";
import { structuredDocumentSchema, structuredText } from "./structured";

export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const sourceId = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const moduleCode = z.string().regex(/^[A-Z0-9-]{2,40}$/);
const title = z.string().trim().min(1).max(160);
const page = z.number().int().positive().max(20000);
export const evidenceRefSchema = z
  .object({
    sourceId,
    sha256: hashSchema,
    first: page,
    last: page,
    evidenceHash: hashSchema,
  })
  .strict()
  .refine((ref) => ref.last >= ref.first, "Invalid physical page range.");

const range = z
  .object({ sourceId, first: page, last: page })
  .strict()
  .refine((value) => value.last >= value.first, "Invalid mapped physical page range.");
export const manifestSchema = z
  .object({
    version: z.literal(1),
    institution: title,
    moduleCode,
    scope: z.enum(["provisional", "verified"]),
    scopeNote: title,
    sources: z
      .array(
        z
          .object({
            id: sourceId,
            role: z.enum(["syllabus_master", "reference_reading", "assessment_reference"]),
            edition: title,
            filename: z
              .string()
              .max(200)
              .regex(/^[^/\\:]+\.pdf$/i),
            sha256: hashSchema,
            remoteProcessing: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    unitMapping: z
      .array(
        z
          .object({
            unitCode: moduleCode,
            title,
            status: z.enum(["working", "held", "excluded"]),
            pages: z.array(range).max(100),
            referenceSections: z.array(title).max(30),
            sessions: z.array(title).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    if (manifest.sources.filter((source) => source.role === "syllabus_master").length !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Register one syllabus authority.",
      });
    if (new Set(manifest.sources.map((source) => source.id)).size !== manifest.sources.length)
      ctx.addIssue({ code: "custom", path: ["sources"], message: "Source IDs must be unique." });
    if (
      new Set(manifest.unitMapping.map((unit) => unit.unitCode)).size !==
      manifest.unitMapping.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["unitMapping"],
        message: "Unit codes must be unique.",
      });
    for (const [index, unit] of manifest.unitMapping.entries()) {
      if (
        (unit.status === "working" && !unit.sessions.length) ||
        (unit.status === "excluded" && (unit.pages.length || unit.sessions.length))
      )
        ctx.addIssue({
          code: "custom",
          path: ["unitMapping", index],
          message:
            "Working units need a session plan. Excluded units cannot map pages or sessions.",
        });
      if (
        !unit.unitCode.startsWith(manifest.moduleCode + "-") ||
        unit.pages.some((row) => !manifest.sources.some((source) => source.id === row.sourceId))
      )
        ctx.addIssue({
          code: "custom",
          path: ["unitMapping", index],
          message: "The unit and its page ranges must reference this module's sources.",
        });
    }
  });

export type FactoryManifest = z.infer<typeof manifestSchema>;
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type FactoryEvidence = { ref: EvidenceRef; body: string; remoteProcessing: boolean };

export function hashValue(value: unknown) {
  function ordered(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(ordered);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, ordered((item as Record<string, unknown>)[key])]),
      );
    return item;
  }
  return createHash("sha256")
    .update(JSON.stringify(ordered(value)))
    .digest("hex");
}
export async function loadFactoryManifest(code: string) {
  const checked = moduleCode.parse(code);
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(resolve("content", checked.toLowerCase(), "manifest.json"), "utf8")),
  );
  if (manifest.moduleCode !== checked)
    throw new Error("Manifest module code does not match its directory.");
  return manifest;
}
export function checkedUnit(manifest: FactoryManifest, code: string) {
  assertCurriculumScope(manifest.institution, manifest.moduleCode, code);
  const unit = manifest.unitMapping.find(
    (unit) => unit.unitCode === code && unit.status === "working",
  );
  if (!unit)
    throw new Error("Select a unit mapped for generation. Held units require a scope decision.");
  return unit;
}

export const exclusionSchema = z
  .object({
    kind: z.enum(["blank", "cover", "table_of_contents", "out_of_scope"]),
    sourceId,
    sha256: hashSchema,
    first: page,
    last: page,
    compared: z.literal(true),
    note: z.string().trim().min(15).max(500),
  })
  .strict();

const evidenceSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("instructional"), document: structuredDocumentSchema }).strict(),
      exclusionSchema,
    ]),
  )
  .min(1)
  .max(600);

export function makeEvidence(document: z.infer<typeof structuredDocumentSchema>): EvidenceRef {
  return {
    sourceId: document.source.document,
    sha256: document.source.sha256,
    first: document.source.pageStart,
    last: document.source.pageEnd,
    evidenceHash: hashValue(document),
  };
}
export function acceptsEvidence(
  manifest: FactoryManifest,
  code: string,
  ref: Pick<EvidenceRef, "sourceId" | "sha256" | "first" | "last">,
) {
  const unit = checkedUnit(manifest, code);
  return (
    manifest.sources.some((source) => source.id === ref.sourceId && source.sha256 === ref.sha256) &&
    unit.pages.some(
      (row) => row.sourceId === ref.sourceId && ref.first >= row.first && ref.last <= row.last,
    )
  );
}
export function validateEvidenceCoverage(
  manifest: FactoryManifest,
  code: string,
  refs: { sourceId: string; sha256: string; first: number; last: number }[],
) {
  const counted = new Set<string>();
  const unit = checkedUnit(manifest, code);
  if (!unit.pages.length)
    throw new Error("Map physical PDF pages before converting or generating this unit.");
  for (const ref of refs) {
    if (ref.last < ref.first || !acceptsEvidence(manifest, code, ref))
      throw new Error("A page is outside its mapped unit range or locked to a different PDF.");
    for (let number = ref.first; number <= ref.last; number++) {
      const key = ref.sourceId + ":" + number;
      if (counted.has(key)) throw new Error("Overlapping evidence ranges at " + key);
      counted.add(key);
    }
  }
  for (const range of unit.pages) {
    for (let page = range.first; page <= range.last; page++)
      if (!counted.has(range.sourceId + ":" + page))
        throw new Error(
          "The evidence review ledger does not cover " + range.sourceId + " page " + page + ".",
        );
  }
}

export function reviewedEvidence(manifest: FactoryManifest, code: string, input: unknown) {
  const included: FactoryEvidence[] = [];
  const skipped: z.infer<typeof exclusionSchema>[] = [];
  const records = evidenceSchema.parse(input);
  validateEvidenceCoverage(
    manifest,
    code,
    records.map((record) =>
      record.kind === "instructional" ? makeEvidence(record.document) : record,
    ),
  );
  for (const record of records) {
    if (record.kind !== "instructional") {
      skipped.push(record);
      continue;
    }
    const ref = makeEvidence(record.document);
    if (
      record.document.parser.review !== "source-compared" ||
      record.document.parser.profile === "verified-blank-page"
    )
      throw new Error(
        "Only instructional evidence compared against the physical PDF can feed generation.",
      );
    const reading = record.document.blocks
      .filter((block) => block.type === "markdown")
      .map((block) => block.markdown)
      .join("\n");
    if (!/[\p{L}\p{N}]/u.test(reading))
      throw new Error("Figure-only pages require a reviewed factual transcription for generation.");
    for (const block of record.document.blocks)
      if (block.type === "markdown") validateFactoryMath(block.markdown);
    included.push({
      ref: makeEvidence(record.document),
      body: structuredText(record.document),
      remoteProcessing: manifest.sources.find((source) => source.id === ref.sourceId)!
        .remoteProcessing,
    });
  }
  return { included, skipped };
}

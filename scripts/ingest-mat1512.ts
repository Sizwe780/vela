import "dotenv/config";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ingest } from "../lib/ingest/service";
import { createIngestionRepository } from "../lib/ingest/repository";
import { embedTokens, assertVectors, type Embedder } from "../lib/ingest/embeddings";
import { getAIConfig, type AIProvider } from "../lib/ai/config";
import { chunkText } from "../lib/ingest/chunker";

type Document = { unitCode: string; sourceId: string; sourceName: string; sha256: string; pdfStart: number; pdfEnd: number; text: string; pages: { pdfPage: number; printedPage: number; byteStart: number; byteEnd: number }[] };
type Unit = { code: string; title: string; position: number; criterion: string; scope: string };
type Plan = { version: number; scope: string; extractionNote: string; files: { id: string; filename: string; sha256: string; pages: number; edition?: string }[]; units: Unit[]; documents: Document[] };
const prisma = new PrismaClient();
const work = resolve("../work/mat1512");
const sourceRoot = process.env.MAT1512_INPUT_DIR || "C:/Users/sizwe/Documents/LMS/Mat1512";
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const sourceUrl = (doc: Pick<Document, "sourceId" | "sha256">, page: number) => `/api/sources/${doc.sourceId}?sha=${doc.sha256}#page=${page}`;

async function main() {
  if (!process.argv.includes("--legacy-raw")) throw new Error("Raw PDF extraction is deprecated. Use parse:math and ingest:structured. To reproduce the archived text-only pilot explicitly, add --legacy-raw.");
  const plan = JSON.parse(await readFile(resolve(work, "ingestion-plan.json"), "utf8")) as Plan;
  const providerArg = process.argv.find(argument => argument.startsWith("--provider="))?.split("=")[1] ?? "ollama";
  if (!["ollama", "cloudflare"].includes(providerArg)) throw new Error("Choose --provider=ollama or --provider=cloudflare.");
  const provider = providerArg as AIProvider;
  process.env.AI_PROVIDER = provider;
  const chunks = plan.documents.reduce((sum, document) => sum + chunkText(document.text).length, 0);
  console.log(`MAT1512 plan: ${plan.units.length} thematic units, ${plan.documents.length} source segments, ${chunks} chunks per provider; ${provider}.`);
  if (process.argv.includes("--plan")) return;
  // Store immutable local snapshots. Original user files are never changed.
  const snapshot = resolve(work, "sources", digest(plan.files.map(file => file.sha256).join(":" )).slice(0, 16));
  await mkdir(snapshot, { recursive: true });
  for (const file of plan.files) {
    const source = resolve(sourceRoot, file.filename);
    if (digest(await readFile(source)) !== file.sha256) throw new Error(`Source changed after extraction: ${file.filename}`);
    await copyFile(source, resolve(snapshot, file.filename));
  }
  let env = await readFile(".env", "utf8");
  const configLine = `MAT1512_SOURCE_DIR=${JSON.stringify(snapshot)}`;
  env = /^MAT1512_SOURCE_DIR=.*$/m.test(env) ? env.replace(/^MAT1512_SOURCE_DIR=.*$/m, configLine) : `${env.trimEnd()}\n${configLine}\n`;
  await writeFile(".env", env);

  const qualification = await prisma.qualification.findUniqueOrThrow({ where: { institution_code_stream: { institution: "UNISA", code: "90104", stream: "PSM" } } });
  const module = await prisma.module.findUniqueOrThrow({ where: { institution_code: { institution: "UNISA", code: "MAT1512" } } });
  const starts: Record<string, [number, number]> = { "MAT1512-U1": [13, 115], "MAT1512-U2": [52, 110], "MAT1512-U3": [67, 222], "MAT1512-U4": [95, 308], "MAT1512-U5": [99, 382] };
  const unitSources = Object.fromEntries(plan.units.map(unit => [unit.code, plan.files.map((file, index) => ({ label: file.id === "guide" ? "UNISA MAT1512 study guide" : "Stewart 8e · US edition", url: sourceUrl({ sourceId: file.id, sha256: file.sha256 }, starts[unit.code][index]) }))]));
  const metadata = {
    ...(module.metadata && typeof module.metadata === "object" && !Array.isArray(module.metadata) ? module.metadata : {}),
    nqfLevel: 5, credits: 12, notionalHours: 120, studyYear: 1, delivery: "Year module",
    catalogEvidence: { url: "https://unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Subjects-%26-modules/All-modules/Calculus-A-%E2%80%93-MAT1512", checkedOn: "2026-11-05", facts: ["NQF 5", "12 credits", "Year module"], qualificationExitNqf: 7 },
    userReported: { verification: "UNVERIFIED_CURRENT_POLICY", semester: 1, prerequisites: "Matric Mathematics 50%+/Level 4 or MAT1510/MAT1511", formativeWeight: 0.2, examWeight: 0.8, overallPassPercent: 50, examMinimumPercent: 40, proctoring: "UNISA IRIS / Invigilator App protocols", note: "Supplied by the user. Not confirmed by a current tutorial letter; not enforced as official academic rules." },
    scopeNote: plan.scope, extractionNote: plan.extractionNote,
    sourceEditionNote: "The guide names Metric Version 8e ISBN 9781305272378. The supplied Stewart PDF is the US 8e student edition ISBN 9781285741550. Sections were mapped by title; pagination is specific to the supplied files.",
    sources: unitSources["MAT1512-U1"], unitSources, files: plan.files,
    units: plan.units.map(unit => ({ ...unit, criterionAuthority: "CURRICULUM", criterionProvenance: "User-provided thematic alignment, checked for topic coverage in the supplied PDFs. Not independently verified SAQA or CAPS criteria." })),
  };
  await prisma.module.update({ where: { id: module.id }, data: { metadata } });
  const mappings = new Map<string, { studyUnitId: string; learningOutcomeId: string; assessmentCriterionId: string }>();
  for (const unit of plan.units) {
    const conflicting = await prisma.studyUnit.findUnique({ where: { moduleId_position: { moduleId: module.id, position: unit.position } } });
    if (conflicting && conflicting.code !== unit.code) throw new Error(`Existing study unit occupies position ${unit.position}; no content was overwritten.`);
    const study = await prisma.studyUnit.upsert({ where: { moduleId_code: { moduleId: module.id, code: unit.code } }, create: { moduleId: module.id, code: unit.code, title: unit.title, position: unit.position }, update: { title: unit.title } });
    const criterion = await prisma.assessmentCriterion.upsert({ where: { qualificationId_code: { qualificationId: qualification.id, code: `LOCAL-${unit.code}` } }, create: { qualificationId: qualification.id, code: `LOCAL-${unit.code}`, description: `${unit.criterion} Local curriculum alignment supplied by the user; not verified official SAQA/CAPS criteria.`, authority: "CURRICULUM", sourceUrl: "http://localhost:3200/api/modules/MAT1512" }, update: {} });
    const outcome = await prisma.learningOutcome.upsert({ where: { studyUnitId_code: { studyUnitId: study.id, code: "LO1" } }, create: { studyUnitId: study.id, code: "LO1", description: unit.criterion, position: 1, assessmentCriteria: { connect: { id: criterion.id } } }, update: { assessmentCriteria: { connect: { id: criterion.id } } } });
    mappings.set(unit.code, { studyUnitId: study.id, learningOutcomeId: outcome.id, assessmentCriterionId: criterion.id });
  }
  await mkdir(resolve(work, "embedding-cache"), { recursive: true });
  const space = getAIConfig().embeddingSpace;
  const cachedEmbed: Embedder = async (inputs, context) => {
    const path = resolve(work, "embedding-cache", `${digest(JSON.stringify([space, context?.purpose, context?.texts]))}.json`);
    try { const saved = JSON.parse(await readFile(path, "utf8")); assertVectors(saved, inputs.length, space.dimensions); return saved; } catch { /* Cache miss: use the actual configured model. */ }
    const vectors = await embedTokens(inputs, context); await writeFile(path, JSON.stringify(vectors)); return vectors;
  };
  const repository = createIngestionRepository({ query: statement => prisma.$queryRaw(statement), transaction: action => prisma.$transaction(tx => action({ query: statement => tx.$queryRaw(statement) }), { maxWait: 30_000, timeout: 180_000 }) });
  const receipts: unknown[] = []; let cursor = 0; let completed = 0;
  async function worker() {
    while (cursor < plan.documents.length) {
      const doc = plan.documents[cursor++];
      let receipt;
      for (let retry = 0; retry < 3; retry++) {
        try { receipt = await ingest({ moduleCode: "MAT1512", ...mappings.get(doc.unitCode)!, sourceName: doc.sourceName, parsedPdf: { text: doc.text } }, repository, cachedEmbed); break; }
        catch (error) { if (retry === 2) throw error; console.warn(`Retrying ${provider}: ${doc.sourceName}`); }
      }
      if (!receipt) throw new Error("Missing ingestion receipt");
      const rows = await prisma.contentChunk.findMany({ where: { ingestionId: receipt.ingestionId }, select: { id: true, chunkIndex: true, sourceByteStart: true, sourceByteEnd: true } });
      await prisma.$transaction(async tx => {
        for (const row of rows) {
          const start = [...doc.pages].reverse().find(page => page.byteStart <= (row.sourceByteStart ?? 0)) ?? doc.pages[0];
          const end = [...doc.pages].reverse().find(page => page.byteStart < (row.sourceByteEnd ?? 0)) ?? start;
          await tx.contentChunk.update({ where: { id: row.id }, data: { resourceUrl: sourceUrl(doc, start.pdfPage), title: `${doc.sourceId === "guide" ? "UNISA guide" : "Stewart 8e"} · PDF ${start.pdfPage === end.pdfPage ? `p. ${start.pdfPage}` : `pp. ${start.pdfPage}-${end.pdfPage}`} · chunk ${(row.chunkIndex ?? 0) + 1}` } });
        }
      }, { maxWait: 30_000, timeout: 180_000 });
      receipts.push({ unitCode: doc.unitCode, sourceId: doc.sourceId, pdfStart: doc.pdfStart, pdfEnd: doc.pdfEnd, ...receipt });
      console.log(`[${provider}] ${++completed}/${plan.documents.length}: ${doc.unitCode} ${doc.sourceName} — ${receipt.chunkCount} chunks${receipt.reused ? " (reused)" : ""}`);
    }
  }
  const settled = await Promise.allSettled(Array.from({ length: provider === "ollama" ? 2 : 3 }, () => worker()));
  await writeFile(resolve(work, `receipts-${provider}.json`), JSON.stringify({ provider, planVersion: plan.version, units: Object.fromEntries(mappings), receipts }, null, 2));
  const failure = settled.find(result => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  console.log(`COMPLETE ${provider}: ${completed} segments, ${chunks} chunks. Sources and curriculum provenance saved.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MAT1512 ingestion failed."); process.exitCode = 1; }).finally(() => prisma.$disconnect());

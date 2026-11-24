import "dotenv/config";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { mathSpans } from "../lib/content/math";
import { structuredDocumentSchema } from "../lib/content/structured";

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.ingestion.findMany({ where: { learningOutcome: { studyUnit: { code: "MAT1512-U1" } }, AND: [{ structuredContent: { path: ["parser", "name"], equals: "marker" } }, { structuredContent: { path: ["source", "pageStart"], equals: 14 } }, { structuredContent: { path: ["source", "pageEnd"], equals: 14 } }] }, include: { chunks: true, assessmentCriterion: true } });
    assert.deepEqual(rows.map(row => row.embeddingProvider).sort(), ["cloudflare", "ollama"]);
    const checks = rows.map(row => {
      const document = structuredDocumentSchema.parse(row.structuredContent);
      assert.equal(document.parser.review, "source-compared");
      assert.equal(mathSpans(row.sourceText).length, 14);
      assert.ok(row.sourceText.includes(String.raw`\frac{x^2 - 4}{x - 2}`));
      assert.ok(row.sourceText.includes(String.raw`\lim_{x\to 2}`));
      for (const chunk of row.chunks) { mathSpans(chunk.body!); assert.ok(chunk.resourceUrl?.endsWith("#page=14")); }
      const check = { provider: row.embeddingProvider, ingestionId: row.id, chunks: row.chunks.length, formulas: 14, pdfPage: 14, sourceSha256: document.source.sha256, criterion: row.assessmentCriterion.code, criterionAuthority: row.assessmentCriterion.authority, reviewNotes: document.parser.reviewNotes };
      console.log(`PASS Marker database: ${JSON.stringify(check)}`);
      return check;
    });
    await writeFile("math-verification.json", JSON.stringify({ checkedOn: new Date().toISOString(), rawOcr: { parser: "Marker 2.1.0 / Surya 0.23.0", seconds: 197.72, formulas: 13, sourceComparison: "One omitted standalone limit restored from original page; unedited machine output preserved in the private job directory." }, checks }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

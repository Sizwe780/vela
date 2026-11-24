import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../generated/app-client";
import {
  acceptsEvidence,
  loadFactoryManifest,
  makeEvidence,
} from "../lib/content/factory-evidence";
import { validateFactoryMath } from "../lib/content/factory-markdown";
import { documentSourceUrl, structuredDocumentSchema } from "../lib/content/structured";
import { embedTokens } from "../lib/ingest/embeddings";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { readJSON } from "./content-factory-files";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const moduleCode = z.string().regex(/^[A-Z0-9-]{2,40}$/);
const mappingSchema = z
  .object({
    institution: z.string().trim().min(1).max(160),
    module: moduleCode,
    outcome: id,
    criterion: id,
  })
  .strict();

async function main() {
  const [file, unitCode, provider = "ollama", ...flags] = process.argv.slice(2);
  if (!file || !unitCode || (provider !== "ollama" && provider !== "cloudflare"))
    throw new Error(
      "Usage: npm run ingest:structured -- FILE UNIT [ollama|cloudflare] --institution=UNISA --module=CODE --outcome=ID --criterion=ID",
    );
  moduleCode.parse(unitCode);
  const mapping = flags.length
    ? mappingSchema.parse(
        Object.fromEntries(
          flags.map((flag) => {
            const entry = /^--([a-z]+)=(.+)$/.exec(flag);
            if (!entry) throw new Error("Use --name=value for mapping options.");
            return [entry[1], entry[2]];
          }),
        ),
      )
    : undefined;
  if (!mapping && !unitCode.startsWith("MAT1512-"))
    throw new Error("Supply the institution, module code, outcome ID and criterion ID.");
  const institution = mapping?.institution ?? "UNISA";
  const code = mapping?.module ?? "MAT1512";
  const structuredContent = structuredDocumentSchema.parse(await readJSON(file));

  if (mapping) {
    const manifest = await loadFactoryManifest(code);
    const ref = makeEvidence(structuredContent);
    if (manifest.institution !== institution || !acceptsEvidence(manifest, unitCode, ref))
      throw new Error("Evidence is outside the module's mapped and hash-locked source ranges.");
    if (
      structuredContent.parser.review !== "source-compared" ||
      structuredContent.parser.profile === "verified-blank-page"
    )
      throw new Error("Index only source-compared instructional evidence.");
    if (
      provider === "cloudflare" &&
      !manifest.sources.find((source) => source.id === ref.sourceId)?.remoteProcessing
    )
      throw new Error("The source manifest does not permit remote processing.");
    for (const block of structuredContent.blocks)
      if (block.type === "markdown") validateFactoryMath(block.markdown);
  }

  process.env.AI_PROVIDER = provider;
  const url = new URL(process.env.DATABASE_URL!);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const insecure = url.searchParams.get("sslmode") === "disable" || local;
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.toString(),
      ssl: insecure ? false : { rejectUnauthorized: true },
    }),
  });
  try {
    const unit = await prisma.studyUnit.findFirstOrThrow({
      where: { code: unitCode, module: { institution, code } },
      select: { id: true },
    });
    const legacyOutcome = mapping
      ? null
      : await prisma.learningOutcome.findFirst({
          where: { studyUnitId: unit.id },
          orderBy: { position: "asc" },
          select: { id: true, assessmentCriteria: { select: { id: true }, take: 1 } },
        });
    const learningOutcomeId = mapping?.outcome ?? legacyOutcome?.id;
    const assessmentCriterionId = mapping?.criterion ?? legacyOutcome?.assessmentCriteria[0]?.id;
    if (!learningOutcomeId || !assessmentCriterionId)
      throw new Error("Register a curriculum mapping before indexing evidence.");
    const repository = createIngestionRepository(
      {
        query: (statement) => prisma.$queryRaw(statement),
        transaction: (callback) =>
          prisma.$transaction((tx) => callback({ query: (statement) => tx.$queryRaw(statement) }), {
            timeout: 60_000,
          }),
      },
      institution,
    );
    const source = structuredContent.source;
    const label = structuredContent.parser.name === "marker" ? "Marker OCR" : "Math-aware";
    const result = await ingest(
      {
        moduleCode: code,
        studyUnitId: unit.id,
        learningOutcomeId,
        assessmentCriterionId,
        sourceName: `${label} ${source.document} · PDF ${source.pageStart}–${source.pageEnd}`,
        structuredContent,
      },
      repository,
      embedTokens,
    );
    await prisma.contentChunk.updateMany({
      where: { ingestionId: result.ingestionId },
      data: { resourceUrl: documentSourceUrl(structuredContent) },
    });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Structured ingestion failed.");
  process.exitCode = 1;
});

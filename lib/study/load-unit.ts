import "server-only";
import { publishedStudyUnit } from "./published-units";
import { unstable_cache } from "next/cache";
import { deduplicateReadings } from "./readings";
import { structuredDocumentSchema } from "../content/structured";
import { prisma } from "../db";
import { demoUnit } from "./demo";
import type { StudyUnitView } from "../tutor/types";
import { z } from "zod";
import { moduleCapabilities } from "../capabilities";

const sourceSchema = z.array(z.object({ label: z.string(), url: z.string() }));
const moduleInfoSchema = z.object({
  nqfLevel: z.number(),
  credits: z.number(),
  delivery: z.string(),
  scopeNote: z.string(),
  extractionNote: z.string(),
  sources: sourceSchema,
  unitSources: z.record(sourceSchema).optional(),
  conversion: z
    .object({
      total: z.number(),
      converted: z.number(),
      needsReview: z.number(),
      units: z.record(
        z.object({ total: z.number(), converted: z.number(), needsReview: z.number() }),
      ),
    })
    .optional(),
});

async function readStudyUnit(id: string): Promise<StudyUnitView | null> {
  const sessionUnit = await prisma.studyUnit.findFirst({
    where: { id },
    select: {
      id: true,
      code: true,
      title: true,
      position: true,
      module: { select: { id: true, code: true, title: true, institution: true, metadata: true } },
      sessions: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          markdown: true,
          visual: true,
          position: true,
          version: true,
        },
      },
      learningOutcomes: { select: { id: true, code: true, description: true } },
    },
  });
  if (sessionUnit?.sessions.length)
    return {
      id: sessionUnit.id,
      code: sessionUnit.code,
      title: sessionUnit.title,
      position: sessionUnit.position,
      moduleId: sessionUnit.module.id,
      moduleCode: sessionUnit.module.code,
      moduleTitle: sessionUnit.module.title,
      capabilities: moduleCapabilities(
        sessionUnit.module.institution,
        sessionUnit.module.code,
        sessionUnit.module.metadata,
      ),
      preview: false,
      outcomes: sessionUnit.learningOutcomes,
      documents: [],
      chunks: [],
      sessions: sessionUnit.sessions,
    };
  const unit = await prisma.studyUnit.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      title: true,
      position: true,
      module: { select: { id: true, code: true, title: true, metadata: true, institution: true } },
      learningOutcomes: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          code: true,
          description: true,
          ingestions: {
            orderBy: { createdAt: "asc" },
            select: { id: true, sourceName: true, sourceText: true, structuredContent: true },
          },
          contentChunks: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              body: true,
              ingestionId: true,
              resourceUrl: true,
              assessmentCriterion: {
                select: { code: true, description: true, sourceUrl: true, authority: true },
              },
            },
          },
        },
      },
    },
  });
  if (!unit) return null;
  const documents: StudyUnitView["documents"] = unit.learningOutcomes.flatMap((outcome) => [
    ...outcome.ingestions.map((source) => ({
      id: source.id,
      title: source.sourceName ?? outcome.description,
      text: source.sourceText,
      ...(structuredDocumentSchema.safeParse(source.structuredContent).success
        ? { structuredContent: structuredDocumentSchema.parse(source.structuredContent) }
        : {}),
    })),
    ...outcome.contentChunks
      .filter((chunk) => !chunk.ingestionId && chunk.body)
      .map((chunk) => ({ id: chunk.id, title: chunk.title, text: chunk.body! })),
  ]);
  const info = moduleInfoSchema.safeParse(unit.module.metadata);
  return {
    id: unit.id,
    code: unit.code,
    title: unit.title,
    position: unit.position,
    moduleId: unit.module.id,
    moduleCode: unit.module.code,
    moduleTitle: unit.module.title,
    capabilities: moduleCapabilities(
      unit.module.institution,
      unit.module.code,
      unit.module.metadata,
    ),
    preview: false,
    ...(info.success
      ? {
          moduleInfo: {
            ...info.data,
            extractionNote: documents.some((document) => "structuredContent" in document)
              ? "Math-aware readings cover only their stated PDF pages. Legacy extraction remains available separately and may contain damaged mathematical notation."
              : info.data.extractionNote,
            sources: info.data.unitSources?.[unit.code] ?? info.data.sources,
            ...(info.data.conversion?.units[unit.code]
              ? { conversion: info.data.conversion.units[unit.code] }
              : {}),
          },
        }
      : {}),
    outcomes: unit.learningOutcomes.map(({ id, code, description }) => ({ id, code, description })),
    // Re-embedding the same source in another provider space should not repeat
    // its reading text. Keep all chunk IDs for citations into either ingestion.
    documents: deduplicateReadings(documents),
    chunks: unit.learningOutcomes.flatMap((outcome) =>
      outcome.contentChunks
        .filter((chunk) => chunk.body)
        .map((chunk) => ({
          id: chunk.id,
          title: chunk.title,
          body: chunk.body!,
          documentId: chunk.ingestionId,
          criterionCode: chunk.assessmentCriterion?.code ?? null,
          criterionDescription: chunk.assessmentCriterion?.description ?? null,
          criterionSourceUrl: chunk.assessmentCriterion?.sourceUrl ?? null,
          criterionAuthority: chunk.assessmentCriterion?.authority,
          sourceUrl: chunk.resourceUrl,
        })),
    ),
  };
}

// Auth stays in the route; this contains published curriculum only.
const cachedStudyUnit = unstable_cache(
  (id: string, _sessionRevisions: string) => readStudyUnit(id),
  ["published-study-unit-v3"],
  {
    revalidate: 60,
    tags: ["curriculum"],
  },
);

export async function loadStudyUnit(value: string): Promise<StudyUnitView | null> {
  if (value === "demo") return demoUnit;
  const units = await prisma.studyUnit.findMany({
    where: { ...publishedStudyUnit, OR: [{ id: value }, { code: value }] },
    select: {
      id: true,
      sessions: { orderBy: { position: "asc" }, select: { id: true, version: true } },
    },
    take: 2,
  });
  if (units.length !== 1) return null;
  const [unit] = units;
  // Seeding scripts run outside Next.js and can publish between web requests.
  // A revision change must bypass stale reader and citation content immediately.
  return cachedStudyUnit(unit.id, JSON.stringify(unit.sessions));
}

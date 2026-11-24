import { currentLessonEvidenceSql } from "../content/current-lesson-evidence";
import { Prisma } from "@prisma/client";
import type { QueryDatabase } from "../ingest/repository";
import { assertVectors } from "../ingest/embeddings";
import { getAIConfig, type AIProvider } from "../ai/config";
import type { Citation } from "./types";

export const RETRIEVAL_LIMIT = 6;
export const MIN_SIMILARITY = 0.2;
export type RetrievedChunk = {
  chunkId: string;
  title: string;
  body: string;
  similarity: number;
  criterionId: string;
  criterionCode: string;
  criterionDescription: string;
  criterionSourceUrl: string;
  saqaId: string;
  criterionAuthority?: string;
  resourceUrl?: string | null;
  sourceFormat?: string;
  sourceReview?: string | null;
};
export type PublishedSession = {
  id: string;
  title: string;
  markdown: string;
  version: number;
  position?: number;
};
export interface TutorRepository {
  getSession?(unitId: string, sessionId: string): Promise<PublishedSession | null>;
  unitExists(studyUnitId: string): Promise<boolean>;
  search(studyUnitId: string, vector: number[], sessionId?: string): Promise<RetrievedChunk[]>;
}

export function createTutorRepository(db: QueryDatabase, provider?: AIProvider): TutorRepository {
  return {
    getSession: async (unitId, sessionId) =>
      (
        await db.query<PublishedSession>(
          Prisma.sql`SELECT id,title,markdown,version,position FROM "StudySession" WHERE id=${sessionId} AND "studyUnitId"=${unitId}`,
        )
      )[0] ?? null,
    unitExists: async (id) =>
      (await db.query(Prisma.sql`SELECT "id" FROM "StudyUnit" WHERE "id" = ${id}`)).length > 0,
    search: async (studyUnitId, vector, sessionId) => {
      const space = getAIConfig(provider).embeddingSpace;
      assertVectors([vector], 1, space.dimensions);
      const vectorColumn = Prisma.raw(
        space.dimensions === 768 ? 'c."embedding768"' : 'c."embedding"',
      );
      const literal = `[${vector.join(",")}]`;
      return db.query<RetrievedChunk>(Prisma.sql`
        SELECT c."id" AS "chunkId", c."title", c."body", c."resourceUrl",
          CASE WHEN i."sourceName" LIKE 'Vela original / %' THEN 'vela-authored-lesson' WHEN i."structuredContent" IS NULL THEN 'legacy-text' ELSE 'structured-markdown' END AS "sourceFormat",
          i."structuredContent"->'parser'->>'review' AS "sourceReview",
          1 - (${vectorColumn} <=> ${literal}::vector) AS "similarity",
          ac."id" AS "criterionId", ac."code" AS "criterionCode",
          ac."description" AS "criterionDescription", ac."sourceUrl" AS "criterionSourceUrl", ac."authority" AS "criterionAuthority", q."saqaId"
        FROM "ContentChunk" c
        JOIN "LearningOutcome" lo ON lo."id" = c."learningOutcomeId"
        JOIN "Ingestion" i ON i."id" = c."ingestionId"
        JOIN "AssessmentCriterion" ac ON ac."id" = c."assessmentCriterionId"
        JOIN "Qualification" q ON q."id" = ac."qualificationId"
        WHERE lo."studyUnitId" = ${studyUnitId} AND ${vectorColumn} IS NOT NULL
          ${sessionId ? Prisma.sql`AND right(c."resourceUrl", length(${"/sessions/" + sessionId}::text)) = ${"/sessions/" + sessionId}` : Prisma.empty}
          AND ${currentLessonEvidenceSql} AND c."body" IS NOT NULL AND i."embeddingModel" = ${space.model}
          AND i."embeddingProvider" = ${space.provider} AND i."embeddingDimensions" = ${space.dimensions}
          AND i."embeddingBaseUrl" = ${space.baseUrl}
          AND COALESCE(i."structuredContent"->'parser'->>'profile','') <> 'verified-blank-page'
          AND (i."structuredContent" IS NOT NULL OR i."sourceName" LIKE 'Vela original / %' OR NOT EXISTS (
            SELECT 1 FROM "Ingestion" upgraded JOIN "LearningOutcome" upgraded_lo ON upgraded_lo."id" = upgraded."learningOutcomeId"
            WHERE upgraded_lo."studyUnitId" = ${studyUnitId} AND upgraded."structuredContent" IS NOT NULL
          ))
          AND 1 - (${vectorColumn} <=> ${literal}::vector) >= ${MIN_SIMILARITY}
        ORDER BY ${vectorColumn} <=> ${literal}::vector, c."id"
        LIMIT ${RETRIEVAL_LIMIT}
      `);
    },
  };
}

export function toCitations(chunks: RetrievedChunk[], studyUnitId: string): Citation[] {
  return chunks.map((chunk, index) => ({
    label: `C${index + 1}`,
    chunkId: chunk.chunkId,
    title: chunk.title,
    excerpt: chunk.body.slice(0, 260),
    similarity: chunk.similarity,
    url: `/study/${encodeURIComponent(studyUnitId)}#chunk-${encodeURIComponent(chunk.chunkId)}`,
    ...(chunk.resourceUrl ? { sourceUrl: chunk.resourceUrl } : {}),
    criterion: {
      id: chunk.criterionId,
      code: chunk.criterionCode,
      description: chunk.criterionDescription,
      sourceUrl: chunk.criterionSourceUrl,
      saqaId: chunk.saqaId,
      ...(chunk.criterionAuthority ? { authority: chunk.criterionAuthority } : {}),
    },
  }));
}

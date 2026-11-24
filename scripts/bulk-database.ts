import { Pool, type PoolClient } from "pg";
import { Prisma } from "@prisma/client";
import type { Database, QueryDatabase } from "../lib/ingest/repository";

// Node TLS works without Windows Schannel account credentials. Keep certificate
// verification enabled; use the existing shared, parameterized SQL repository.
export class BulkDatabase implements Database {
  private pool: Pool;
  constructor(connectionString = process.env.DATABASE_URL!) {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("channel_binding");
    this.pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true },
      max: 2, connectionTimeoutMillis: 20_000, idleTimeoutMillis: 30_000 });
    this.pool.on("error", error => console.error("Idle database connection:", error.message));
  }
  async query<T>(sql: Prisma.Sql): Promise<T[]> { return (await this.pool.query(sql.text, sql.values)).rows as T[]; }
  async transaction<T>(callback: (tx: QueryDatabase) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '60s'");
      const result = await callback({ query: async <R>(sql: Prisma.Sql) => (await client.query(sql.text, sql.values)).rows as R[] });
      await client.query("COMMIT");
      return result;
    } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    finally { client.release(); }
  }
  priorReadings() {
    return this.query<{ id: string; embeddingProvider: string; structuredContent: unknown; chunkCount: number }>(Prisma.sql`
      SELECT i."id", i."embeddingProvider", i."structuredContent", count(c."id")::int AS "chunkCount"
      FROM "Ingestion" i JOIN "LearningOutcome" lo ON lo."id"=i."learningOutcomeId"
      JOIN "StudyUnit" u ON u."id"=lo."studyUnitId" JOIN "Module" m ON m."id"=u."moduleId"
      JOIN "ContentChunk" c ON c."ingestionId"=i."id"
      WHERE m."code"='MAT1512' AND m."institution"='UNISA' AND i."structuredContent"->'parser'->>'name'='marker'
      GROUP BY i."id"`);
  }
  units() {
    return this.query<{ id: string; code: string; moduleId: string; learningOutcomeId: string; assessmentCriterionId: string }>(Prisma.sql`
      SELECT DISTINCT ON (u."id") u."id", u."code", u."moduleId", lo."id" AS "learningOutcomeId", ac."id" AS "assessmentCriterionId"
      FROM "StudyUnit" u JOIN "Module" m ON m."id"=u."moduleId"
      JOIN "LearningOutcome" lo ON lo."studyUnitId"=u."id"
      JOIN "_OutcomeCriteria" oc ON oc."B"=lo."id" JOIN "AssessmentCriterion" ac ON ac."id"=oc."A"
      WHERE m."code"='MAT1512' AND m."institution"='UNISA' ORDER BY u."id", lo."position", ac."id"`);
  }
  repairLinks(ingestionId: string, url: string) {
    return this.query(Prisma.sql`UPDATE "ContentChunk" SET "resourceUrl"=${url} WHERE "ingestionId"=${ingestionId} AND "resourceUrl" IS DISTINCT FROM ${url}`);
  }
  disconnect() { return this.pool.end(); }
}

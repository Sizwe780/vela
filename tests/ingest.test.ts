import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import type { Prisma } from "@prisma/client";
import { Tiktoken } from "js-tiktoken/lite";
import ranks from "js-tiktoken/ranks/cl100k_base";
import { chunkText } from "../lib/ingest/chunker";
import { ingest } from "../lib/ingest/service";
import { createIngestionRepository, type Database, type QueryDatabase } from "../lib/ingest/repository";
import { assertVectors, embedTokens } from "../lib/ingest/embeddings";
import { parseInput, MAX_REQUEST_BYTES } from "../lib/ingest/input";
import { readJson } from "../lib/ingest/http";
import { authorizeIngestion } from "../lib/ingest/auth";
import { IngestError, publicError } from "../lib/ingest/errors";

const tokenizer = new Tiktoken(ranks);
const input = { moduleCode: "MAT1512", studyUnitId: "su1", learningOutcomeId: "lo1", assessmentCriterionId: "ac1", text: "Calculus studies rates of change. ".repeat(200) };
const fakeEmbedding = (seed = 1) => Array.from({ length: 1536 }, (_, index) => index === 0 ? seed : 0);
let pg: PGlite;
let database: Database;
let repository: ReturnType<typeof createIngestionRepository>;

before(async () => {
  // Pin cloud fixtures independently of the application's chosen .env provider.
  Object.assign(process.env, { AI_PROVIDER: "openai", OPENAI_BASE_URL: "https://api.openai.com/v1", CHAT_MODEL: "gpt-4o", EMBEDDING_MODEL: "text-embedding-3-small", EMBEDDING_DIMENSIONS: "1536" });
  pg = new PGlite({ extensions: { vector } });
  for (const migration of ["20261105000000_init", "20261105000100_integrity_and_vector_index", "20261105000200_local_ai", "20261105000400_curriculum_provenance", "20261105000500_structured_documents"]) {
    await pg.exec(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
  }
  // Explicit synthetic fixtures, not official SAQA assessment criteria.
  await pg.exec(`
    INSERT INTO "Qualification" ("id", "institution", "code", "stream", "title", "streamTitle", "saqaId", "nqfExitLevel", "updatedAt")
      VALUES ('q1', 'UNISA', '90104', 'PSM', 'Test B.Ed', 'Test stream', '103108', 7, now());
    INSERT INTO "Module" ("id", "institution", "code", "title", "updatedAt") VALUES ('m1', 'UNISA', 'MAT1512', 'Calculus A', now());
    INSERT INTO "QualificationModule" VALUES ('q1', 'm1', 1, 1);
    INSERT INTO "StudyUnit" ("id", "moduleId", "code", "title", "position", "updatedAt") VALUES ('su1', 'm1', 'U1', 'Test unit', 1, now());
    INSERT INTO "LearningOutcome" ("id", "studyUnitId", "code", "description", "position", "updatedAt") VALUES ('lo1', 'su1', 'LO1', 'Test outcome', 1, now());
    INSERT INTO "AssessmentCriterion" ("id", "qualificationId", "code", "description", "sourceUrl") VALUES ('ac1', 'q1', 'TEST-ONLY', 'Synthetic criterion', 'https://example.org/test-only');
    INSERT INTO "_OutcomeCriteria" ("A", "B") VALUES ('ac1', 'lo1');
  `);
  const query = async <T>(statement: Prisma.Sql) => (await pg.query<T>(statement.text, statement.values)).rows;
  database = {
    query,
    transaction: (callback) => pg.transaction((tx) => callback({ query: async <T>(statement: Prisma.Sql) => (await tx.query<T>(statement.text, statement.values)).rows })),
  };
  repository = createIngestionRepository(database);
});
after(async () => { await pg?.close(); });

test("500-token chunks, exactly 50 overlapping tokens and complete coverage", () => {
  const tokens = tokenizer.encode(input.text, [], []);
  const chunks = chunkText(input.text);
  assert.ok(chunks.length > 1);
  const rebuilt: number[] = [];
  for (const [index, chunk] of chunks.entries()) {
    assert.equal(chunk.tokenStart, index * 450);
    assert.equal(chunk.tokenCount, index === chunks.length - 1 ? tokens.length - index * 450 : 500);
    assert.deepEqual(chunk.tokenIds, tokens.slice(chunk.tokenStart, chunk.tokenEnd));
    if (index) assert.deepEqual(chunks[index - 1].tokenIds.slice(-50), chunk.tokenIds.slice(0, 50));
    rebuilt.push(...chunk.tokenIds.slice(index ? 50 : 0));
  }
  assert.deepEqual(rebuilt, tokens);
});

test("exact 500-token input has no overlap-only tail; short input is one chunk", () => {
  const exact = " a".repeat(500);
  assert.equal(tokenizer.encode(exact).length, 500);
  assert.equal(chunkText(exact).length, 1);
  assert.equal(chunkText("Short text").length, 1);
});

test("Unicode display text is lossless while embedding windows remain exact", () => {
  const text = "∫ f(x) dx = π · α 😊 漢字 ".repeat(160);
  const chunks = chunkText(text);
  const tokens = tokenizer.encode(text);
  for (const chunk of chunks) {
    assert.ok(!chunk.body.includes("\uFFFD"));
    assert.equal(chunk.body, Buffer.from(text).subarray(chunk.sourceByteStart, chunk.sourceByteEnd).toString("utf8"));
    assert.deepEqual(chunk.tokenIds, tokens.slice(chunk.tokenStart, chunk.tokenEnd));
  }
});

test("raw text and parsed PDF validation; reject blank, mixed, NUL and oversized input", () => {
  assert.equal(parseInput(input).sourceKind, "TEXT");
  const { text, ...metadata } = input;
  assert.equal(parseInput({ ...metadata, parsedPdf: { text, numpages: 3 } }).sourceKind, "PARSED_PDF");
  for (const invalid of [ { ...input, text: "  " }, { ...input, text: "\u0000" }, { ...input, text: "\ud800" }, { ...input, parsedPdf: { text } }, { ...metadata }, { ...input, text: "😀".repeat(260_000) } ]) {
    assert.throws(() => parseInput(invalid), IngestError);
  }
  assert.throws(() => chunkText(" a".repeat(100_001)), (error: unknown) => error instanceof IngestError && error.status === 413);
});

test("missing auth configuration fails closed; bearer authentication is required", () => {
  const old = process.env.INGEST_API_TOKEN;
  try {
    delete process.env.INGEST_API_TOKEN;
    assert.throws(() => authorizeIngestion(null), (error: unknown) => error instanceof IngestError && error.status === 503);
    process.env.INGEST_API_TOKEN = "test-admin-token";
    assert.throws(() => authorizeIngestion("Bearer wrong"), (error: unknown) => error instanceof IngestError && error.status === 401);
    authorizeIngestion("Bearer test-admin-token");
  } finally { if (old === undefined) delete process.env.INGEST_API_TOKEN; else process.env.INGEST_API_TOKEN = old; }
});

test("HTTP JSON parsing enforces streamed byte limits and content type", async () => {
  assert.deepEqual(await readJson(new Request("http://localhost/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })), input);
  await assert.rejects(readJson(new Request("http://localhost/api/ingest", { method: "POST", body: "bad" })), (error: unknown) => error instanceof IngestError && error.status === 415);
  await assert.rejects(readJson(new Request("http://localhost/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: "{" })), (error: unknown) => error instanceof IngestError && error.status === 400);
  await assert.rejects(readJson(new Request("http://localhost/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(MAX_REQUEST_BYTES + 1) })), (error: unknown) => error instanceof IngestError && error.status === 413);
});

test("approved mappings are checked before embedding; reject module and criterion mismatches", async () => {
  for (const request of [{ ...input, moduleCode: "MAT1503" }, { ...input, studyUnitId: "other" }, { ...input, assessmentCriterionId: "other" }]) {
    await assert.rejects(ingest(request, repository, async () => { assert.fail("Must not embed invalid mappings"); }), (error: unknown) => error instanceof IngestError && error.status === 422);
  }
});

test("pgvector persistence, metadata, SQL-safe text, cosine search and idempotent retry", async () => {
  let calls = 0;
  const request = { ...input, sourceName: "Robert'); DROP TABLE Module; --" };
  const embed = async (tokens: number[][]) => { calls++; return tokens.map(() => fakeEmbedding()); };
  const result = await ingest(request, repository, embed);
  assert.equal(result.reused, false);
  assert.equal(result.moduleCode, "MAT1512");
  assert.equal(result.saqaId, "103108");
  assert.ok(result.chunkCount > 1);
  const rows = (await pg.query<{ tokenCount: number; dimensions: number; assessmentCriterionId: string; chunkIndex: number }>(`SELECT "tokenCount", vector_dims("embedding") AS dimensions, "assessmentCriterionId", "chunkIndex" FROM "ContentChunk" WHERE "ingestionId" = $1 ORDER BY "chunkIndex"`, [result.ingestionId])).rows;
  assert.equal(rows.length, result.chunkCount);
  assert.equal(rows[0].tokenCount, 500);
  assert.ok(rows.every((row) => row.dimensions === 1536 && row.assessmentCriterionId === "ac1"));
  const nearest = (await pg.query<{ similarity: number }>(`SELECT 1 - ("embedding" <=> $1::vector) AS similarity FROM "ContentChunk" ORDER BY "embedding" <=> $1::vector LIMIT 1`, [JSON.stringify(fakeEmbedding())])).rows[0];
  assert.equal(nearest.similarity, 1);
  const retry = await ingest(request, repository, embed);
  assert.equal(retry.ingestionId, result.ingestionId);
  assert.equal(retry.reused, true);
  assert.equal(calls, 1);
});

test("provider failure and invalid vectors leave no database writes", async () => {
  const count = async () => (await pg.query<{ count: number }>('SELECT count(*)::int AS count FROM "Ingestion"')).rows[0].count;
  const before = await count();
  await assert.rejects(ingest({ ...input, sourceName: "provider-failure" }, repository, async () => { throw new Error("provider down"); }));
  await assert.rejects(ingest({ ...input, sourceName: "bad-vector" }, repository, async (batch) => batch.map(() => [1, 2])));
  assert.equal(await count(), before);
  assert.throws(() => assertVectors([Array(1536).fill(NaN)], 1), IngestError);
});

test("simultaneous identical requests save a single ingestion", async () => {
  let calls = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  const embed = async (batch: number[][]) => {
    if (++calls === 2) release();
    await ready;
    return batch.map(() => fakeEmbedding());
  };
  const request = { ...input, sourceName: "concurrency-fixture" };
  const [first, second] = await Promise.all([ingest(request, repository, embed), ingest(request, repository, embed)]);
  assert.equal(first.ingestionId, second.ingestionId);
  assert.equal(Number(first.reused) + Number(second.reused), 1);
  const rows = (await pg.query<{ count: number }>('SELECT count(*)::int AS count FROM "Ingestion" WHERE "sourceName" = $1', ["concurrency-fixture"])).rows;
  assert.equal(rows[0].count, 1);
});

test("database failure rolls back the ingestion and all chunks", async () => {
  let insertCount = 0;
  const failing: Database = {
    query: database.query,
    transaction: (callback) => database.transaction((tx) => callback({
      query: <T>(statement: Prisma.Sql) => {
        if (statement.text.includes('INSERT INTO "ContentChunk"') && ++insertCount === 2) throw new Error("Injected storage failure");
        return tx.query<T>(statement);
      },
    })),
  };
  await assert.rejects(ingest({ ...input, sourceName: "rollback-fixture" }, createIngestionRepository(failing), async (batch) => batch.map(() => fakeEmbedding())));
  const rows = (await pg.query('SELECT "id" FROM "Ingestion" WHERE "sourceName" = $1', ["rollback-fixture"])).rows;
  assert.equal(rows.length, 0);
});

test("parsed PDF ingestion links the same curriculum and stores its source", async () => {
  const { text, ...metadata } = input;
  const result = await ingest({ ...metadata, parsedPdf: { text }, sourceName: "unit1.pdf" }, repository, async (batch) => batch.map(() => fakeEmbedding()));
  const source = (await pg.query<{ sourceKind: string; sourceText: string }>('SELECT "sourceKind", "sourceText" FROM "Ingestion" WHERE "id" = $1', [result.ingestionId])).rows[0];
  assert.equal(source.sourceKind, "PARSED_PDF");
  assert.equal(source.sourceText, text);
});

test("structured math and visual JSON persist atomically with searchable LaTeX", async () => {
  const { text: _text, ...metadata } = input;
  const markdown = String.raw`The limit is $\lim_{x\to2}\frac{x^2-4}{x-2}=4$.`;
  const structuredContent = { version: 1, parser: { name: "marker", version: "2.1.0", review: "machine" }, source: { document: "guide", sha256: "a".repeat(64), pageStart: 14, pageEnd: 14 }, blocks: [{ id: "text", type: "markdown", markdown }, { id: "graph", type: "interactive", kind: "limit", title: "Limit explorer", caption: "Teaching adaptation", sourcePage: 14, initialX: 1 }] };
  const result = await ingest({ ...metadata, structuredContent }, repository, async batch => batch.map(() => fakeEmbedding()));
  const row = (await pg.query<{ structuredContent: unknown; body: string }>('SELECT i."structuredContent", c."body" FROM "Ingestion" i JOIN "ContentChunk" c ON c."ingestionId"=i."id" WHERE i."id"=$1', [result.ingestionId])).rows[0];
  assert.deepEqual(row.structuredContent, structuredContent);
  assert.ok(row.body.includes(markdown));
  const repeated = await ingest({ ...metadata, structuredContent }, repository, async () => { throw new Error("Must reuse"); });
  assert.equal(repeated.reused, true);
});

test("embedding adapter batches token arrays, reorders response indexes and hides provider errors", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENAI_API_KEY;
  const lengths: number[] = [];
  try {
    process.env.OPENAI_API_KEY = "synthetic-test-key";
    globalThis.fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as { input: number[][]; model: string; dimensions: number };
      assert.equal(request.model, "text-embedding-3-small");
      assert.equal(request.dimensions, 1536);
      lengths.push(request.input.length);
      return Response.json({ data: request.input.map((_, index) => ({ index, embedding: fakeEmbedding(index + 1) })).reverse() });
    };
    const vectors = await embedTokens(Array.from({ length: 33 }, () => [1, 2]));
    assert.deepEqual(lengths, [32, 1]);
    assert.equal(vectors[0][0], 1);
    assert.equal(vectors[31][0], 32);
    globalThis.fetch = async () => new Response("private provider message", { status: 429 });
    await assert.rejects(embedTokens([[1]]), (error: unknown) => error instanceof IngestError && error.status === 503 && !error.message.includes("private"));
    globalThis.fetch = async () => Response.json({ data: [null] });
    await assert.rejects(embedTokens([[1]]), (error: unknown) => error instanceof IngestError && error.status === 502);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; }
  assert.equal(publicError(new Error("secret database URL")).error.message.includes("secret"), false);
});

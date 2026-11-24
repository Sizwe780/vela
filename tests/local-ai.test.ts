import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { streamText } from "ai";
import { getAIConfig } from "../lib/ai/config";
import { createChatModel } from "../lib/ai/chat-model";
import { embedTokens, assertVectors } from "../lib/ingest/embeddings";
import { createIngestionRepository, type Database } from "../lib/ingest/repository";
import { createTutorRepository } from "../lib/tutor/retrieval";
import { ingest } from "../lib/ingest/service";
import { IngestError } from "../lib/ingest/errors";
import type { Prisma } from "@prisma/client";

const keys = ["AI_PROVIDER", "OPENAI_BASE_URL", "OPENAI_API_KEY", "CHAT_MODEL", "EMBEDDING_MODEL", "EMBEDDING_DIMENSIONS"] as const;
const local = { AI_PROVIDER: "ollama", OPENAI_BASE_URL: "http://localhost:11434/v1", CHAT_MODEL: "llama3", EMBEDDING_MODEL: "nomic-embed-text", EMBEDDING_DIMENSIONS: "768" };
const cloud = { AI_PROVIDER: "openai", OPENAI_BASE_URL: "https://api.openai.com/v1", CHAT_MODEL: "gpt-4o", EMBEDDING_MODEL: "text-embedding-3-small", EMBEDDING_DIMENSIONS: "1536" };
async function withConfig<T>(values: Partial<Record<typeof keys[number], string>>, action: () => Promise<T>) {
  const saved = keys.map((key) => [key, process.env[key]] as const);
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
  try { return await action(); }
  finally { for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
}
const embedding = (dimensions: number) => [1, ...Array(dimensions - 1).fill(0)];
let pg: PGlite;
let database: Database;

before(async () => {
  pg = new PGlite({ extensions: { vector } });
  for (const name of ["20261105000000_init", "20261105000100_integrity_and_vector_index"]) await pg.exec(await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"));
  // Create a real legacy 1536-dimensional row BEFORE applying the upgrade.
  await pg.exec(`
    INSERT INTO "Qualification" ("id", "institution", "code", "stream", "title", "streamTitle", "saqaId", "nqfExitLevel", "updatedAt") VALUES ('q', 'UNISA', '90104', 'PSM', 'Test qualification', 'Test stream', '103108', 7, now());
    INSERT INTO "Module" ("id", "institution", "code", "title", "updatedAt") VALUES ('m', 'UNISA', 'MAT1512', 'Calculus A', now());
    INSERT INTO "QualificationModule" VALUES ('q', 'm', 1, 1);
    INSERT INTO "StudyUnit" ("id", "moduleId", "code", "title", "position", "updatedAt") VALUES ('su', 'm', 'U1', 'Synthetic unit', 1, now());
    INSERT INTO "LearningOutcome" ("id", "studyUnitId", "code", "description", "position", "updatedAt") VALUES ('lo', 'su', 'LO1', 'Synthetic outcome', 1, now());
    INSERT INTO "AssessmentCriterion" ("id", "qualificationId", "code", "description", "sourceUrl") VALUES ('ac', 'q', 'TEST-ONLY', 'Synthetic criterion', 'https://example.org/test');
    INSERT INTO "_OutcomeCriteria" VALUES ('ac', 'lo');
    INSERT INTO "Ingestion" ("id", "fingerprint", "learningOutcomeId", "assessmentCriterionId", "sourceKind", "sourceText", "embeddingModel", "tokenizer", "chunkSize", "overlap") VALUES ('legacy-ingestion', 'legacy-hash', 'lo', 'ac', 'TEXT', 'Legacy OpenAI source', 'text-embedding-3-small', 'cl100k_base', 500, 50);
  `);
  await pg.query('INSERT INTO "ContentChunk" ("id", "learningOutcomeId", "title", "body", "position", "updatedAt", "ingestionId", "assessmentCriterionId", "chunkIndex", "tokenStart", "tokenEnd", "tokenCount", "sourceByteStart", "sourceByteEnd", "embedding") VALUES ($1, $2, $3, $4, 1, now(), $5, $6, 0, 0, 5, 5, 0, 20, $7::vector)', ["legacy-chunk", "lo", "Legacy source", "Legacy OpenAI source", "legacy-ingestion", "ac", JSON.stringify(embedding(1536))]);
  await pg.exec(await readFile("prisma/migrations/20261105000200_local_ai/migration.sql", "utf8"));
  await pg.exec(await readFile("prisma/migrations/20261105000400_curriculum_provenance/migration.sql", "utf8"));
  await pg.exec(await readFile("prisma/migrations/20261105000500_structured_documents/migration.sql", "utf8"));
  await pg.exec(await readFile("prisma/migrations/20261107000100_study_sessions/migration.sql", "utf8"));
  database = {
    query: async <T>(statement: Prisma.Sql) => (await pg.query<T>(statement.text, statement.values)).rows,
    transaction: (action) => pg.transaction((tx) => action({ query: async <T>(statement: Prisma.Sql) => (await tx.query<T>(statement.text, statement.values)).rows })),
  };
});
after(async () => { await pg?.close(); });

test("local configuration uses a dummy key, normalizes endpoint, and validates vector widths", async () => {
  await withConfig({ ...local, OPENAI_API_KEY: "DO-NOT-SEND-THIS", OPENAI_BASE_URL: `${local.OPENAI_BASE_URL}/` }, async () => {
    const config = getAIConfig();
    assert.equal(config.apiKey, "ollama");
    assert.equal(config.baseUrl, local.OPENAI_BASE_URL);
    assert.equal(config.chatModel, "llama3");
    assert.equal(config.embeddingSpace.dimensions, 768);
    assertVectors([embedding(768)], 1);
    assert.throws(() => assertVectors([embedding(1536)], 1), IngestError);
  });
  await withConfig({ ...local, EMBEDDING_DIMENSIONS: "1024" }, async () => { assert.throws(getAIConfig, IngestError); });
});

test("Ollama embeddings send text with Nomic document/query prefixes and batch locally", async () => {
  await withConfig({ ...local, OPENAI_API_KEY: "PRIVATE-CLOUD-KEY" }, async () => {
    const oldFetch = globalThis.fetch;
    const calls: { input: string[]; model: string; dimensions?: number }[] = [];
    try {
      globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "http://localhost:11434/v1/embeddings");
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer ollama");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.model, "nomic-embed-text");
        assert.equal(body.dimensions, undefined);
        calls.push(body);
        return Response.json({ data: body.input.map((_: string, index: number) => ({ index, embedding: embedding(768) })) });
      };
      const texts = Array.from({ length: 9 }, (_, index) => `Passage ${index} ∫ 😊`);
      const vectors = await embedTokens(texts.map(() => [1, 2]), { purpose: "document", texts });
      assert.equal(vectors.length, 9);
      assert.deepEqual(calls.map((call) => call.input.length), [8, 1]);
      assert.equal(calls[0].input[0], "search_document: Passage 0 ∫ 😊");
      await embedTokens([[1, 2]], { purpose: "query", texts: ["What is a derivative?"] });
      assert.deepEqual(calls[2].input, ["search_query: What is a derivative?"]);
      await assert.rejects(embedTokens([[1, 2]]), (error: unknown) => error instanceof IngestError && error.code === "MISSING_EMBEDDING_TEXT");
    } finally { globalThis.fetch = oldFetch; }
  });
});

test("Ollama dimension mismatches fail rather than padding or mixing spaces", async () => {
  await withConfig(local, async () => {
    const oldFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => Response.json({ data: [{ index: 0, embedding: embedding(1536) }] });
      await assert.rejects(embedTokens([[1]], { purpose: "query", texts: ["Question"] }), (error: unknown) => error instanceof IngestError && error.code === "INVALID_EMBEDDINGS");
    } finally { globalThis.fetch = oldFetch; }
  });
});

test("cancelled local embedding requests propagate the signal and never fall back to cloud", async () => {
  await withConfig({ ...local, OPENAI_API_KEY: "PRIVATE-CLOUD-KEY" }, async () => {
    const oldFetch = globalThis.fetch;
    let calls = 0;
    try {
      globalThis.fetch = async (url, init) => {
        calls++;
        assert.equal(String(url), "http://localhost:11434/v1/embeddings");
        assert.equal(init?.signal?.aborted, true);
        throw new DOMException("Cancelled", "AbortError");
      };
      await assert.rejects(embedTokens([[1]], { purpose: "query", texts: ["Question"], signal: AbortSignal.abort() }), (error: unknown) => error instanceof IngestError && error.status === 503);
      assert.equal(calls, 1);
    } finally { globalThis.fetch = oldFetch; }
  });
});

test("AI SDK factory streams Chat Completions using llama3 and the local endpoint", async () => {
  await withConfig(local, async () => {
    const oldFetch = globalThis.fetch;
    let calls = 0;
    try {
      globalThis.fetch = async (url, init) => {
        calls++;
        assert.equal(String(url), "http://localhost:11434/v1/chat/completions");
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer ollama");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.model, "llama3");
        assert.equal(body.stream, true);
        const delta = { id: "local-chat", object: "chat.completion.chunk", created: 1, model: "llama3", choices: [{ index: 0, delta: { role: "assistant", content: "A locally streamed answer." }, finish_reason: null }] };
        const finish = { ...delta, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] };
        return new Response(`data: ${JSON.stringify(delta)}\n\ndata: ${JSON.stringify(finish)}\n\ndata: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } });
      };
      const result = streamText({ model: createChatModel(), prompt: "Explain the derivative", maxRetries: 0 });
      assert.equal(await result.text, "A locally streamed answer.");
      assert.equal(calls, 1);
    } finally { globalThis.fetch = oldFetch; }
  });
});

test("upgrade preserves and correctly labels existing 1536-dimensional OpenAI vectors", async () => {
  await withConfig(cloud, async () => {
    const row = (await pg.query<{ embeddingProvider: string; embeddingDimensions: number; embeddingBaseUrl: string }>('SELECT "embeddingProvider", "embeddingDimensions", "embeddingBaseUrl" FROM "Ingestion" WHERE "id" = $1', ["legacy-ingestion"])).rows[0];
    assert.deepEqual(row, { embeddingProvider: "openai", embeddingDimensions: 1536, embeddingBaseUrl: "https://api.openai.com/v1" });
    const results = await createTutorRepository(database).search("su", embedding(1536));
    assert.deepEqual(results.map((source) => source.chunkId), ["legacy-chunk"]);
  });
});

test("local ingestion and RAG use 768-dimensional storage, preserve old vectors and deduplicate retries", async () => {
  await withConfig(local, async () => {
    const repository = createIngestionRepository(database);
    const input = { moduleCode: "MAT1512", studyUnitId: "su", learningOutcomeId: "lo", assessmentCriterionId: "ac", sourceName: "local-source", text: "The derivative measures an instantaneous rate of change." };
    let calls = 0;
    const embed = async (tokens: number[][], context?: { purpose: string; texts: string[] }) => { calls++; assert.equal(context?.purpose, "document"); assert.equal(context?.texts[0], input.text); return tokens.map(() => embedding(768)); };
    const first = await ingest(input, repository, embed);
    assert.equal(first.embeddingProvider, "ollama");
    assert.equal(first.embeddingDimensions, 768);
    const row = (await pg.query<{ old: boolean; dimensions: number }>('SELECT "embedding" IS NOT NULL AS old, vector_dims("embedding768") AS dimensions FROM "ContentChunk" WHERE "ingestionId" = $1', [first.ingestionId])).rows[0];
    assert.deepEqual(row, { old: false, dimensions: 768 });
    const results = await createTutorRepository(database).search("su", embedding(768));
    assert.equal(results.length, 1);
    assert.ok(results.every((source) => source.chunkId !== "legacy-chunk"));
    assert.ok((await ingest(input, repository, embed)).reused);
    assert.equal(calls, 1);
  });
  await withConfig(cloud, async () => {
    assert.deepEqual((await createTutorRepository(database).search("su", embedding(1536))).map((source) => source.chunkId), ["legacy-chunk"]);
  });
});

test("model and endpoint changes cannot retrieve old local vectors from a different space", async () => {
  for (const changed of [{ ...local, EMBEDDING_MODEL: "different-model" }, { ...local, OPENAI_BASE_URL: "http://localhost:11435/v1" }]) {
    await withConfig(changed, async () => { assert.deepEqual(await createTutorRepository(database).search("su", embedding(768)), []); });
  }
});

test("ingested chunks cannot store both vector widths simultaneously", async () => {
  await assert.rejects(pg.query('UPDATE "ContentChunk" SET "embedding768" = $1::vector WHERE "id" = $2', [JSON.stringify(embedding(768)), "legacy-chunk"]));
});

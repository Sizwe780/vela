import { mathSpans } from "../content/math";
import { createHash } from "node:crypto";
import { chunkText, CHUNK_SIZE, OVERLAP, TOKENIZER, type TextChunk } from "./chunker";
import { assertVectors, type Embedder } from "./embeddings";
import { getAIConfig, type EmbeddingSpace } from "../ai/config";
import { parseInput, type ParsedInput } from "./input";

export type Context = {
  moduleCode: string;
  saqaId: string;
  learningOutcomeId: string;
  assessmentCriterionId: string;
};
export type Receipt = { ingestionId: string; chunkCount: number };
export type SaveInput = {
  input: ParsedInput;
  fingerprint: string;
  chunks: TextChunk[];
  vectors: number[][];
  embeddingSpace: EmbeddingSpace;
};
export interface IngestionRepository {
  resolveContext(input: ParsedInput): Promise<Context>;
  find(fingerprint: string): Promise<Receipt | null>;
  save(data: SaveInput): Promise<Receipt & { reused: boolean }>;
}

export async function prepareIngestion(
  input: unknown,
  repository: IngestionRepository,
  embed: Embedder,
) {
  const parsed = parseInput(input);
  const context = await repository.resolveContext(parsed);
  const chunks = chunkText(parsed.sourceText);
  if (parsed.structuredContent || parsed.sourceName?.startsWith("Vela original / ")) {
    // Keep the canonical 500/50 token window, but expand display/embedding text
    // to whole formula boundaries, just as UTF-8 glyphs are already preserved.
    const spans = mathSpans(parsed.sourceText).map((span) => ({
      start: Buffer.byteLength(parsed.sourceText.slice(0, span.start)),
      end: Buffer.byteLength(parsed.sourceText.slice(0, span.end)),
    }));
    const bytes = Buffer.from(parsed.sourceText);
    for (const chunk of chunks) {
      for (const span of spans) {
        if (chunk.sourceByteStart > span.start && chunk.sourceByteStart < span.end)
          chunk.sourceByteStart = span.start;
        if (chunk.sourceByteEnd > span.start && chunk.sourceByteEnd < span.end)
          chunk.sourceByteEnd = span.end;
      }
      chunk.body = bytes.subarray(chunk.sourceByteStart, chunk.sourceByteEnd).toString("utf8");
    }
  }
  const { embeddingSpace } = getAIConfig();
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: parsed.sourceName?.startsWith("Vela original / ")
          ? 4
          : parsed.structuredContent
            ? 3
            : 2,
        ...(parsed.structuredContent ? { structuredContent: parsed.structuredContent } : {}),
        moduleCode: parsed.moduleCode,
        studyUnitId: parsed.studyUnitId,
        learningOutcomeId: parsed.learningOutcomeId,
        assessmentCriterionId: parsed.assessmentCriterionId,
        sourceText: parsed.sourceText,
        sourceKind: parsed.sourceKind,
        sourceName: parsed.sourceName ?? null,
        embeddingSpace,
        tokenizer: TOKENIZER,
        chunkSize: CHUNK_SIZE,
        overlap: OVERLAP,
      }),
    )
    .digest("hex");
  const existing = await repository.find(fingerprint);
  const metadata = {
    ...context,
    embeddingModel: embeddingSpace.model,
    embeddingProvider: embeddingSpace.provider,
    embeddingDimensions: embeddingSpace.dimensions,
    tokenizer: TOKENIZER,
    chunkSize: CHUNK_SIZE,
    overlap: OVERLAP,
  };
  if (existing) return { fingerprint, metadata, existing, data: null };
  // Provider calls finish before a database transaction starts. On any failure,
  // no ingestion or chunks are inserted.
  const vectors = await embed(
    chunks.map((chunk) => chunk.tokenIds),
    { purpose: "document", texts: chunks.map((chunk) => chunk.body) },
  );
  assertVectors(vectors, chunks.length, embeddingSpace.dimensions);
  return {
    fingerprint,
    metadata,
    existing: null,
    data: { input: parsed, fingerprint, chunks, vectors, embeddingSpace },
  };
}

export async function finishPreparedIngestion(
  plan: Awaited<ReturnType<typeof prepareIngestion>>,
  repository: IngestionRepository,
) {
  if (plan.data) return { ...(await repository.save(plan.data)), ...plan.metadata };
  const prior = await repository.find(plan.fingerprint);
  if (!prior)
    throw new Error("The previously indexed version changed. Prepare the document again.");
  return { ...prior, ...plan.metadata, reused: true };
}

export async function ingest(input: unknown, repository: IngestionRepository, embed: Embedder) {
  const plan = await prepareIngestion(input, repository, embed);
  if (plan.existing) return { ...plan.existing, ...plan.metadata, reused: true };
  return finishPreparedIngestion(plan, repository);
}

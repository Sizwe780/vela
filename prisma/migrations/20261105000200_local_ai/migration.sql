-- Preserve existing OpenAI vectors and record their original embedding space.
ALTER TABLE "Ingestion"
  ADD COLUMN "embeddingProvider" TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN "embeddingDimensions" INTEGER NOT NULL DEFAULT 1536,
  ADD COLUMN "embeddingBaseUrl" TEXT NOT NULL DEFAULT 'https://api.openai.com/v1';
ALTER TABLE "ContentChunk" ADD COLUMN "embedding768" vector(768);

ALTER TABLE "Ingestion" DROP CONSTRAINT "Ingestion_pipeline_contract";
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_pipeline_contract" CHECK (
  "sourceKind" IN ('TEXT', 'PARSED_PDF') AND length("sourceText") > 0 AND
  length("embeddingModel") > 0 AND "embeddingProvider" IN ('openai', 'ollama') AND
  "embeddingDimensions" IN (768, 1536) AND length("embeddingBaseUrl") > 0 AND
  "tokenizer" = 'cl100k_base' AND "chunkSize" = 500 AND "overlap" = 50
);
ALTER TABLE "ContentChunk" DROP CONSTRAINT "ContentChunk_ingested_metadata";
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_ingested_metadata" CHECK (
  "ingestionId" IS NULL OR (
    "assessmentCriterionId" IS NOT NULL AND "body" IS NOT NULL AND
    (("embedding" IS NOT NULL)::int + ("embedding768" IS NOT NULL)::int) = 1 AND
    "chunkIndex" IS NOT NULL AND "chunkIndex" >= 0 AND
    "tokenStart" IS NOT NULL AND "tokenStart" = "chunkIndex" * 450 AND
    "tokenEnd" IS NOT NULL AND "tokenEnd" > "tokenStart" AND
    "tokenCount" IS NOT NULL AND "tokenCount" = "tokenEnd" - "tokenStart" AND "tokenCount" BETWEEN 1 AND 500 AND
    "sourceByteStart" IS NOT NULL AND "sourceByteStart" >= 0 AND
    "sourceByteEnd" IS NOT NULL AND "sourceByteEnd" > "sourceByteStart"
  )
);
CREATE INDEX "ContentChunk_embedding768_hnsw" ON "ContentChunk" USING hnsw ("embedding768" vector_cosine_ops);
CREATE INDEX "Ingestion_embeddingProvider_embeddingModel_embeddingDimensions_idx" ON "Ingestion" ("embeddingProvider", "embeddingModel", "embeddingDimensions");

-- Existing embedding spaces remain isolated; Cloudflare uses the 768-wide index.
ALTER TABLE "Ingestion" DROP CONSTRAINT "Ingestion_pipeline_contract";
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_pipeline_contract" CHECK (
  "sourceKind" IN ('TEXT', 'PARSED_PDF') AND length("sourceText") > 0 AND
  length("embeddingModel") > 0 AND "embeddingProvider" IN ('openai', 'ollama', 'cloudflare') AND
  "embeddingDimensions" IN (768, 1536) AND length("embeddingBaseUrl") > 0 AND
  "tokenizer" = 'cl100k_base' AND "chunkSize" = 500 AND "overlap" = 50
);
CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "studyUnitId" TEXT NOT NULL REFERENCES "StudyUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "provider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "result" JSONB,
  CONSTRAINT "QuizAttempt_result_state" CHECK (("submittedAt" IS NULL) = ("result" IS NULL))
);
CREATE INDEX "QuizAttempt_studentId_createdAt_idx" ON "QuizAttempt"("studentId", "createdAt");
CREATE INDEX "QuizAttempt_studyUnitId_idx" ON "QuizAttempt"("studyUnitId");
ALTER TABLE "QuizQuestion"
  ADD COLUMN "quizAttemptId" TEXT REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD COLUMN "sourceChunkId" TEXT REFERENCES "ContentChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "QuizQuestion_quizAttemptId_idx" ON "QuizQuestion"("quizAttemptId");
CREATE INDEX "QuizQuestion_sourceChunkId_idx" ON "QuizQuestion"("sourceChunkId");

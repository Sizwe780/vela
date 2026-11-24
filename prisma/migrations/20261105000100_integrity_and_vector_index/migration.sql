ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_nqf_range" CHECK ("nqfExitLevel" BETWEEN 1 AND 10);
ALTER TABLE "QualificationModule" ADD CONSTRAINT "QualificationModule_positive_year_position" CHECK ("studyYear" > 0 AND "position" > 0);
ALTER TABLE "StudyUnit" ADD CONSTRAINT "StudyUnit_positive_position" CHECK ("position" > 0);
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_positive_position" CHECK ("position" > 0);
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_positive_points_position" CHECK ("points" > 0 AND "position" > 0);
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_score_attempt_bounds" CHECK ("score" BETWEEN 0 AND 1 AND "attempts" >= 0);
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_positive_position" CHECK ("position" > 0);
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_pipeline_contract" CHECK (
  "sourceKind" IN ('TEXT', 'PARSED_PDF') AND length("sourceText") > 0 AND
  "embeddingModel" = 'text-embedding-3-small' AND "tokenizer" = 'cl100k_base' AND
  "chunkSize" = 500 AND "overlap" = 50
);
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_ingested_metadata" CHECK (
  "ingestionId" IS NULL OR (
    "assessmentCriterionId" IS NOT NULL AND "embedding" IS NOT NULL AND "body" IS NOT NULL AND
    "chunkIndex" IS NOT NULL AND "chunkIndex" >= 0 AND
    "tokenStart" IS NOT NULL AND "tokenStart" = "chunkIndex" * 450 AND
    "tokenEnd" IS NOT NULL AND "tokenEnd" > "tokenStart" AND
    "tokenCount" IS NOT NULL AND "tokenCount" = "tokenEnd" - "tokenStart" AND "tokenCount" BETWEEN 1 AND 500 AND
    "sourceByteStart" IS NOT NULL AND "sourceByteStart" >= 0 AND
    "sourceByteEnd" IS NOT NULL AND "sourceByteEnd" > "sourceByteStart"
  )
);
CREATE INDEX "ContentChunk_embedding_hnsw" ON "ContentChunk" USING hnsw ("embedding" vector_cosine_ops);

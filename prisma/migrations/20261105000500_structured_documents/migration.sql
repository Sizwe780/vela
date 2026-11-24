ALTER TABLE "Ingestion" ADD COLUMN "structuredContent" JSONB;
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_structured_object" CHECK ("structuredContent" IS NULL OR (jsonb_typeof("structuredContent") = 'object' AND "structuredContent"->>'version' = '1' AND jsonb_typeof("structuredContent"->'blocks') = 'array'));

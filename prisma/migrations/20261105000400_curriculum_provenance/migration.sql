ALTER TABLE "Module" ADD COLUMN "metadata" JSONB;
-- Existing mappings have no evidence of independent SAQA verification.
ALTER TABLE "AssessmentCriterion" ADD COLUMN "authority" TEXT NOT NULL DEFAULT 'CURRICULUM';
ALTER TABLE "AssessmentCriterion" ADD CONSTRAINT "AssessmentCriterion_authority" CHECK ("authority" IN ('CURRICULUM', 'SAQA_VERIFIED'));

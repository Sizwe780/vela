ALTER TYPE "LessonDraftStatus" ADD VALUE 'approved';
ALTER TABLE "LessonDraft" ADD COLUMN "factoryProvenance" JSONB, ADD COLUMN "factoryApproval" JSONB;

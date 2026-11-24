CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('TEXT', 'VIDEO', 'AUDIO', 'DOCUMENT', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER');

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "streamTitle" TEXT NOT NULL,
    "saqaId" TEXT NOT NULL,
    "nqfExitLevel" INTEGER NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationModule" (
    "qualificationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "studyYear" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "QualificationModule_pkey" PRIMARY KEY ("qualificationId","moduleId")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "catalogNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyUnit" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningOutcome" (
    "id" TEXT NOT NULL,
    "studyUnitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentChunk" (
    "id" TEXT NOT NULL,
    "learningOutcomeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "resourceUrl" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ingestionId" TEXT,
    "assessmentCriterionId" TEXT,
    "chunkIndex" INTEGER,
    "tokenStart" INTEGER,
    "tokenEnd" INTEGER,
    "tokenCount" INTEGER,
    "sourceByteStart" INTEGER,
    "sourceByteEnd" INTEGER,
    "embedding" vector(1536),

    CONSTRAINT "ContentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentCriterion" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "AssessmentCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingestion" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "learningOutcomeId" TEXT NOT NULL,
    "assessmentCriterionId" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceKind" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "tokenizer" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL,
    "overlap" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "learningOutcomeId" TEXT NOT NULL,
    "kind" "QuestionKind" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "learningOutcomeId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAssessedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OutcomeCriteria" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OutcomeCriteria_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Qualification_saqaId_idx" ON "Qualification"("saqaId");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_institution_code_stream_key" ON "Qualification"("institution", "code", "stream");

-- CreateIndex
CREATE INDEX "QualificationModule_moduleId_idx" ON "QualificationModule"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "QualificationModule_qualificationId_studyYear_position_key" ON "QualificationModule"("qualificationId", "studyYear", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Module_institution_code_key" ON "Module"("institution", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StudyUnit_moduleId_code_key" ON "StudyUnit"("moduleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StudyUnit_moduleId_position_key" ON "StudyUnit"("moduleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LearningOutcome_studyUnitId_code_key" ON "LearningOutcome"("studyUnitId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LearningOutcome_studyUnitId_position_key" ON "LearningOutcome"("studyUnitId", "position");

-- CreateIndex
CREATE INDEX "ContentChunk_assessmentCriterionId_idx" ON "ContentChunk"("assessmentCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentChunk_learningOutcomeId_position_key" ON "ContentChunk"("learningOutcomeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ContentChunk_ingestionId_chunkIndex_key" ON "ContentChunk"("ingestionId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentCriterion_qualificationId_code_key" ON "AssessmentCriterion"("qualificationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Ingestion_fingerprint_key" ON "Ingestion"("fingerprint");

-- CreateIndex
CREATE INDEX "Ingestion_learningOutcomeId_idx" ON "Ingestion"("learningOutcomeId");

-- CreateIndex
CREATE INDEX "Ingestion_assessmentCriterionId_idx" ON "Ingestion"("assessmentCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingestion_id_learningOutcomeId_assessmentCriterionId_key" ON "Ingestion"("id", "learningOutcomeId", "assessmentCriterionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_learningOutcomeId_position_key" ON "QuizQuestion"("learningOutcomeId", "position");

-- CreateIndex
CREATE INDEX "StudentMastery_learningOutcomeId_idx" ON "StudentMastery"("learningOutcomeId");

-- CreateIndex
CREATE INDEX "StudentMastery_studentId_nextReviewAt_idx" ON "StudentMastery"("studentId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMastery_studentId_learningOutcomeId_key" ON "StudentMastery"("studentId", "learningOutcomeId");

-- CreateIndex
CREATE INDEX "_OutcomeCriteria_B_index" ON "_OutcomeCriteria"("B");

-- AddForeignKey
ALTER TABLE "QualificationModule" ADD CONSTRAINT "QualificationModule_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationModule" ADD CONSTRAINT "QualificationModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyUnit" ADD CONSTRAINT "StudyUnit_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningOutcome" ADD CONSTRAINT "LearningOutcome_studyUnitId_fkey" FOREIGN KEY ("studyUnitId") REFERENCES "StudyUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_ingestionId_learningOutcomeId_assessmentCrite_fkey" FOREIGN KEY ("ingestionId", "learningOutcomeId", "assessmentCriterionId") REFERENCES "Ingestion"("id", "learningOutcomeId", "assessmentCriterionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_assessmentCriterionId_fkey" FOREIGN KEY ("assessmentCriterionId") REFERENCES "AssessmentCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentCriterion" ADD CONSTRAINT "AssessmentCriterion_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingestion" ADD CONSTRAINT "Ingestion_assessmentCriterionId_fkey" FOREIGN KEY ("assessmentCriterionId") REFERENCES "AssessmentCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_learningOutcomeId_fkey" FOREIGN KEY ("learningOutcomeId") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutcomeCriteria" ADD CONSTRAINT "_OutcomeCriteria_A_fkey" FOREIGN KEY ("A") REFERENCES "AssessmentCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OutcomeCriteria" ADD CONSTRAINT "_OutcomeCriteria_B_fkey" FOREIGN KEY ("B") REFERENCES "LearningOutcome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

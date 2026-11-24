CREATE TABLE "LearningPreference" (
 "studentId" TEXT PRIMARY KEY,"tutorContext" BOOLEAN NOT NULL DEFAULT false,
 "crossModule" BOOLEAN NOT NULL DEFAULT false,"availability" JSONB NOT NULL DEFAULT '[]',
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "learning_cross_context" CHECK (NOT "crossModule" OR "tutorContext"),
 CONSTRAINT "learning_availability_array" CHECK (jsonb_typeof(availability)='array' AND jsonb_array_length(availability)<=14)
);
CREATE TABLE "LearningConceptState" (
 "studentId" TEXT NOT NULL,"conceptId" TEXT NOT NULL,"modelVersion" TEXT NOT NULL,
 probability DOUBLE PRECISION NOT NULL,observations INTEGER NOT NULL DEFAULT 0,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("studentId","conceptId","modelVersion"),
 CONSTRAINT "concept_probability" CHECK (probability>=0 AND probability<=1),
 CONSTRAINT "concept_observations" CHECK (observations>=0)
);
CREATE TABLE "ConceptCheck" (
 id TEXT PRIMARY KEY,"studentId" TEXT NOT NULL,"moduleId" TEXT NOT NULL,"studyUnitId" TEXT NOT NULL,
 "conceptId" TEXT NOT NULL,"modelVersion" TEXT NOT NULL,"itemKey" TEXT NOT NULL,payload JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL,
 "submittedAt" TIMESTAMP(3),result JSONB,
 FOREIGN KEY ("moduleId") REFERENCES "Module"(id) ON DELETE CASCADE,
 FOREIGN KEY ("studyUnitId") REFERENCES "StudyUnit"(id) ON DELETE CASCADE,
 CONSTRAINT "concept_check_result" CHECK (("submittedAt" IS NULL AND result IS NULL) OR ("submittedAt" IS NOT NULL AND result IS NOT NULL))
);
CREATE INDEX "ConceptCheck_studentId_createdAt_idx" ON "ConceptCheck"("studentId","createdAt");
CREATE INDEX "ConceptCheck_student_concept_idx" ON "ConceptCheck"("studentId","conceptId","modelVersion");
CREATE INDEX "ConceptCheck_moduleId_idx" ON "ConceptCheck"("moduleId");
CREATE INDEX "ConceptCheck_studyUnitId_idx" ON "ConceptCheck"("studyUnitId");

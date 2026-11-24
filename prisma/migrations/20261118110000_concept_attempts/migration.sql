CREATE TABLE "ConceptAttempt" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "studentId" TEXT NOT NULL,
 "sessionId" TEXT NOT NULL REFERENCES "StudySession"("id") ON DELETE CASCADE,
 "learningOutcomeId" TEXT NOT NULL REFERENCES "LearningOutcome"("id") ON DELETE CASCADE,
 "sessionVersion" INTEGER NOT NULL,
 "contentHash" TEXT NOT NULL,
 "challenge" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "processingAt" TIMESTAMP(3),
 "processingToken" TEXT,
 "submissionHash" TEXT,
 "explanation" TEXT,
 "submittedAt" TIMESTAMP(3),
 "verified" BOOLEAN NOT NULL DEFAULT false,
 "score" DOUBLE PRECISION,
 "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
 "result" JSONB,
 CONSTRAINT "ConceptAttempt_score_range" CHECK ("score" IS NULL OR ("score">=0 AND "score"<=1)),
 CONSTRAINT "ConceptAttempt_points_range" CHECK ("pointsAwarded">=0 AND "pointsAwarded"<=10)
);
CREATE INDEX "ConceptAttempt_studentId_createdAt_idx" ON "ConceptAttempt"("studentId","createdAt");
CREATE INDEX "ConceptAttempt_studentId_learningOutcomeId_idx" ON "ConceptAttempt"("studentId","learningOutcomeId");

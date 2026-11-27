CREATE TABLE "LessonAttemptSubmission" (
 "id" TEXT PRIMARY KEY,"attemptId" TEXT NOT NULL REFERENCES "LessonAttempt"("id") ON DELETE CASCADE,
 "mutationId" TEXT NOT NULL,"answer" JSONB NOT NULL,"isLocallyChecked" BOOLEAN NOT NULL DEFAULT false,"aiFeedback" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("attemptId","mutationId")
);
CREATE INDEX "LessonAttemptSubmission_attemptId_createdAt_idx" ON "LessonAttemptSubmission"("attemptId","createdAt");

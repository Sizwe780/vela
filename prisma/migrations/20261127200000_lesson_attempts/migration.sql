ALTER TABLE "StudentProfile" ADD COLUMN "autoStartTimer" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "LessonAttempt" (
 "id" TEXT PRIMARY KEY,"studentId" TEXT NOT NULL,"sessionId" TEXT NOT NULL REFERENCES "StudySession"("id") ON DELETE CASCADE,
 "version" INTEGER NOT NULL,"questionKey" TEXT NOT NULL,"title" TEXT NOT NULL,"question" TEXT NOT NULL,"userAnswer" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'tried',"isLocallyChecked" BOOLEAN NOT NULL DEFAULT false,"aiFeedback" JSONB,
 "submitted" BOOLEAN NOT NULL DEFAULT false,"revision" INTEGER NOT NULL DEFAULT 1,"inReview" BOOLEAN NOT NULL DEFAULT false,
 "nextReviewAt" TIMESTAMP(3),"lastReviewAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("studentId","sessionId","version","questionKey")
);
CREATE INDEX "LessonAttempt_review_idx" ON "LessonAttempt"("studentId","inReview","nextReviewAt");

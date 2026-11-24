ALTER TABLE "StudentProfile" ADD COLUMN "classroomAlerts" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "SupportCategory" AS ENUM ('account', 'learning', 'accessibility', 'technical', 'deletion');
CREATE TYPE "SupportStatus" AS ENUM ('open', 'in_review', 'resolved', 'cancelled');

CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "category" "SupportCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'open',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportRequest_studentId_createdAt_idx" ON "SupportRequest"("studentId", "createdAt");
CREATE INDEX "SupportRequest_status_updatedAt_idx" ON "SupportRequest"("status", "updatedAt");
CREATE UNIQUE INDEX "SupportRequest_pending_deletion_key" ON "SupportRequest"("studentId")
    WHERE "category" = 'deletion' AND "status" IN ('open', 'in_review');

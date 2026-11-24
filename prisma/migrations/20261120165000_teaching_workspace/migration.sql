-- CreateEnum
CREATE TYPE "LessonDraftStatus" AS ENUM ('draft', 'submitted', 'rejected', 'published');

-- AlterTable
ALTER TABLE "QualificationModule" ADD COLUMN     "acceptingEnrollments" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LessonDraft" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "studyUnitId" TEXT NOT NULL,
    "sessionId" TEXT,
    "baseVersion" INTEGER,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "previous" JSONB,
    "publishVersion" INTEGER,
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewNote" TEXT,
    "status" "LessonDraftStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceReview" (
    "studyUnitId" TEXT NOT NULL,
    "ingestionId" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceReview_pkey" PRIMARY KEY ("qualificationId","ingestionId")
);

-- CreateTable
CREATE TABLE "TeachingSettings" (
    "qualificationId" TEXT NOT NULL,
    "displayName" TEXT,
    "supportEmail" TEXT,
    "allowSelfEnrollment" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeachingSettings_pkey" PRIMARY KEY ("qualificationId")
);

-- CreateTable
CREATE TABLE "TeachingCohort" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeachingCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingCohortMember" (
    "cohortId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "TeachingCohortMember_pkey" PRIMARY KEY ("cohortId","studentId")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "cohortId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingSubmission" (
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scores" JSONB,
    "feedback" TEXT,
    "graderId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "TeachingSubmission_pkey" PRIMARY KEY ("assignmentId","studentId")
);

-- CreateTable
CREATE TABLE "TeachingAnnouncement" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "cohortId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingInvite" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "moduleId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "role" "ApplicationRole" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TeachingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAudit" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonDraft_qualificationId_status_updatedAt_idx" ON "LessonDraft"("qualificationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "LessonDraft_sessionId_publishVersion_idx" ON "LessonDraft"("sessionId", "publishVersion");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingCohort_qualificationId_name_key" ON "TeachingCohort"("qualificationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingCohort_qualificationId_id_key" ON "TeachingCohort"("qualificationId", "id");

-- CreateIndex
CREATE INDEX "TeachingCohortMember_studentId_idx" ON "TeachingCohortMember"("studentId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_qualificationId_moduleId_dueAt_idx" ON "TeachingAssignment"("qualificationId", "moduleId", "dueAt");

-- CreateIndex
CREATE INDEX "TeachingSubmission_studentId_idx" ON "TeachingSubmission"("studentId");

-- CreateIndex
CREATE INDEX "TeachingAnnouncement_qualificationId_createdAt_idx" ON "TeachingAnnouncement"("qualificationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingInvite_tokenHash_key" ON "TeachingInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "TeachingInvite_qualificationId_expiresAt_idx" ON "TeachingInvite"("qualificationId", "expiresAt");

-- CreateIndex
CREATE INDEX "TeachingAudit_qualificationId_createdAt_idx" ON "TeachingAudit"("qualificationId", "createdAt");

-- AddForeignKey
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_studyUnitId_fkey" FOREIGN KEY ("studyUnitId") REFERENCES "StudyUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceReview" ADD CONSTRAINT "SourceReview_studyUnitId_fkey" FOREIGN KEY ("studyUnitId") REFERENCES "StudyUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceReview" ADD CONSTRAINT "SourceReview_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSettings" ADD CONSTRAINT "TeachingSettings_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingCohort" ADD CONSTRAINT "TeachingCohort_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingCohortMember" ADD CONSTRAINT "TeachingCohortMember_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "TeachingCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_qualificationId_moduleId_fkey" FOREIGN KEY ("qualificationId", "moduleId") REFERENCES "QualificationModule"("qualificationId", "moduleId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_qualificationId_cohortId_fkey" FOREIGN KEY ("qualificationId", "cohortId") REFERENCES "TeachingCohort"("qualificationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSubmission" ADD CONSTRAINT "TeachingSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAnnouncement" ADD CONSTRAINT "TeachingAnnouncement_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAnnouncement" ADD CONSTRAINT "TeachingAnnouncement_qualificationId_cohortId_fkey" FOREIGN KEY ("qualificationId", "cohortId") REFERENCES "TeachingCohort"("qualificationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingInvite" ADD CONSTRAINT "TeachingInvite_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAudit" ADD CONSTRAINT "TeachingAudit_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

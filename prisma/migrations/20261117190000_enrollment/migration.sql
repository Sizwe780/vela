-- Additive: no updates to source content, notes, progress or existing learners.
SET lock_timeout = '3s';
CREATE TYPE "EnrollmentStatus" AS ENUM ('active', 'completed', 'withdrawn');
CREATE TABLE "Enrollment" (
 "id" TEXT NOT NULL,
 "studentId" TEXT NOT NULL,
 "qualificationId" TEXT NOT NULL,
 "moduleId" TEXT NOT NULL,
 "status" "EnrollmentStatus" NOT NULL DEFAULT 'active',
 "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Enrollment_qualificationId_moduleId_fkey" FOREIGN KEY ("qualificationId","moduleId") REFERENCES "QualificationModule"("qualificationId","moduleId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Enrollment_studentId_qualificationId_moduleId_key" ON "Enrollment"("studentId","qualificationId","moduleId");
CREATE INDEX "Enrollment_studentId_status_idx" ON "Enrollment"("studentId","status");
CREATE INDEX "Enrollment_qualificationId_moduleId_idx" ON "Enrollment"("qualificationId","moduleId");
RESET lock_timeout;

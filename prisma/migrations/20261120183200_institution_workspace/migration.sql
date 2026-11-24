
ALTER TABLE "Qualification" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "QualificationModule" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE TYPE "InstitutionPermission" AS ENUM ('curriculum', 'directory', 'reports', 'access', 'integrations');
CREATE TABLE "InstitutionMembership" (
  "institution" TEXT NOT NULL, "studentId" TEXT NOT NULL, "owner" BOOLEAN NOT NULL DEFAULT false,
  "permissions" "InstitutionPermission"[] DEFAULT ARRAY[]::"InstitutionPermission"[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionMembership_pkey" PRIMARY KEY ("institution", "studentId")
);
CREATE INDEX "InstitutionMembership_studentId_idx" ON "InstitutionMembership"("studentId");
CREATE TABLE "InstitutionIntegration" (
  "institution" TEXT NOT NULL, "ssoProvider" TEXT, "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstitutionIntegration_pkey" PRIMARY KEY ("institution")
);
CREATE TABLE "InstitutionAudit" (
  "id" TEXT NOT NULL, "institution" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL, "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InstitutionAudit_institution_createdAt_idx" ON "InstitutionAudit"("institution", "createdAt");

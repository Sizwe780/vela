-- Additive operator controls only. No learner records are removed by migration.
CREATE TABLE "RetentionHold" (
  "id" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL CHECK ("scope" IN ('all','account','support','moderation','delivery','security')),
  "targetId" TEXT,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "releasedBy" TEXT
);
CREATE INDEX "RetentionHold_scope_targetId_releasedAt_idx" ON "RetentionHold"("scope","targetId","releasedAt");
CREATE TABLE "RetentionRun" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "counts" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RetentionRun_createdAt_idx" ON "RetentionRun"("createdAt");

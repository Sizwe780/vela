SET LOCAL lock_timeout='3s';
ALTER TABLE "StudentProfile" ADD COLUMN "emailConsentAt" TIMESTAMP(3), ADD COLUMN "emailConsentVersion" TEXT;
CREATE TABLE "EmailDelivery" (
  id TEXT PRIMARY KEY,
  "dedupeKey" TEXT NOT NULL UNIQUE,
  "studentId" TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('welcome','recall','test')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','sent','failed','suppressed','uncertain')),
  "consentAt" TIMESTAMP(3),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EmailDelivery_status_availableAt_idx" ON "EmailDelivery"(status,"availableAt");
CREATE INDEX "EmailDelivery_studentId_kind_idx" ON "EmailDelivery"("studentId",kind);
CREATE TABLE "EmailBudget" (day TEXT PRIMARY KEY,attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0 AND attempts<=280));
-- Existing preferences were disabled. Do not infer consent for legacy rows.
UPDATE "StudentProfile" SET "emailReminders"=false WHERE "emailReminders"=true;

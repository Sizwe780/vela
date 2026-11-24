SET LOCAL lock_timeout='3s';
CREATE TABLE "StudyActivityDay" (
  "studentId" TEXT NOT NULL,
  day TEXT NOT NULL CHECK(day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  "moduleId" TEXT NOT NULL REFERENCES "Module"(id) ON DELETE CASCADE,
  seconds INTEGER NOT NULL DEFAULT 0 CHECK(seconds>=0 AND seconds<=86400),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY("studentId",day,"moduleId")
);
CREATE INDEX "StudyActivityDay_studentId_day_idx" ON "StudyActivityDay"("studentId",day);
CREATE TABLE "StudyPresence" (
  "studentId" TEXT PRIMARY KEY,
  "trackingId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "lastPulseAt" TIMESTAMP(3) NOT NULL
);

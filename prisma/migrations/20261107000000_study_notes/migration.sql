CREATE TABLE "StudyNote" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "studyUnitId" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudyNote_studyUnitId_fkey" FOREIGN KEY ("studyUnitId") REFERENCES "StudyUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudyNote_revision_check" CHECK ("revision" >= 0)
);
CREATE UNIQUE INDEX "StudyNote_studentId_studyUnitId_key" ON "StudyNote"("studentId", "studyUnitId");
CREATE INDEX "StudyNote_studyUnitId_idx" ON "StudyNote"("studyUnitId");

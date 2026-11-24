CREATE TABLE "PracticeNotebook" (
 "id" TEXT PRIMARY KEY,
 "studentId" TEXT NOT NULL,
 "title" TEXT NOT NULL CHECK (length("title") BETWEEN 1 AND 120),
 "reflection" TEXT NOT NULL DEFAULT '' CHECK (length("reflection") <= 4000),
 "kind" TEXT NOT NULL DEFAULT 'practice' CHECK ("kind" IN ('practice','mistake')),
 "snapshot" JSONB NOT NULL CHECK (jsonb_typeof("snapshot") = 'object' AND octet_length("snapshot"::text) <= 65536),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PracticeNotebook_studentId_createdAt_id_idx" ON "PracticeNotebook"("studentId", "createdAt", "id");

SET lock_timeout='3s';
CREATE TYPE "ApplicationRole" AS ENUM ('student','staff','admin');
CREATE TYPE "BookmarkSource" AS ENUM ('session','chunk');
CREATE TABLE "StudentProfile" (
 "studentId" TEXT PRIMARY KEY,"displayName" TEXT,"role" "ApplicationRole" NOT NULL DEFAULT 'student',"weeklyGoalMinutes" INTEGER NOT NULL DEFAULT 120,"emailReminders" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StudentProfile_goal_check" CHECK ("weeklyGoalMinutes" BETWEEN 15 AND 1200)
);
CREATE TABLE "StaffMembership" (
 "studentId" TEXT NOT NULL,"qualificationId" TEXT NOT NULL,"role" "ApplicationRole" NOT NULL,
 PRIMARY KEY ("studentId","qualificationId"),
 FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("studentId") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("qualificationId") REFERENCES "Qualification"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StaffMembership_role_check" CHECK(role IN ('staff','admin'))
);
CREATE INDEX "StaffMembership_qualificationId_idx" ON "StaffMembership"("qualificationId");
CREATE TABLE "StudyPosition" (
 "studentId" TEXT NOT NULL,"moduleId" TEXT NOT NULL,"sessionId" TEXT NOT NULL,"updatedAt" TIMESTAMP(3) NOT NULL,
 PRIMARY KEY("studentId","moduleId"),
 FOREIGN KEY("moduleId") REFERENCES "Module"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY("sessionId") REFERENCES "StudySession"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StudyPosition_sessionId_idx" ON "StudyPosition"("sessionId");
CREATE INDEX "StudyPosition_studentId_updatedAt_idx" ON "StudyPosition"("studentId","updatedAt");
CREATE TABLE "StudyBookmark" (
 id TEXT PRIMARY KEY,"studentId" TEXT NOT NULL,"studyUnitId" TEXT NOT NULL,"sourceType" "BookmarkSource" NOT NULL,"sourceId" TEXT NOT NULL,quote TEXT NOT NULL DEFAULT '',"quoteHash" TEXT NOT NULL,title TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY("studyUnitId") REFERENCES "StudyUnit"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudyBookmark_studentId_sourceType_sourceId_quoteHash_key" ON "StudyBookmark"("studentId","sourceType","sourceId","quoteHash");
CREATE INDEX "StudyBookmark_studentId_createdAt_idx" ON "StudyBookmark"("studentId","createdAt");
CREATE INDEX "StudyBookmark_studyUnitId_idx" ON "StudyBookmark"("studyUnitId");
RESET lock_timeout;

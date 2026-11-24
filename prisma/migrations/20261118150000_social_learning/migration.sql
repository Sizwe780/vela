CREATE TABLE "StudyRoomPresence" (
 "studentId" TEXT NOT NULL, "moduleId" TEXT NOT NULL REFERENCES "Module"("id") ON DELETE CASCADE,
 "trackingId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, PRIMARY KEY ("studentId","moduleId")
);
CREATE INDEX "StudyRoomPresence_moduleId_expiresAt_idx" ON "StudyRoomPresence"("moduleId","expiresAt");
CREATE TABLE "DiscussionPost" (
 "id" TEXT PRIMARY KEY, "studentId" TEXT NOT NULL,
 "studyUnitId" TEXT NOT NULL REFERENCES "StudyUnit"("id") ON DELETE CASCADE,
 "sourceType" TEXT NOT NULL CHECK ("sourceType" IN ('session','chunk')), "sourceId" TEXT NOT NULL,
 "sourceHash" TEXT NOT NULL CHECK (length("sourceHash")=64), "anchor" TEXT NOT NULL CHECK (length("anchor")=64),
 "parentId" TEXT REFERENCES "DiscussionPost"("id") ON DELETE CASCADE,
 "body" TEXT NOT NULL CHECK (length("body")<=2000),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "DiscussionPost_studyUnitId_sourceHash_anchor_createdAt_idx" ON "DiscussionPost"("studyUnitId","sourceHash","anchor","createdAt");
CREATE INDEX "DiscussionPost_studentId_createdAt_idx" ON "DiscussionPost"("studentId","createdAt");
CREATE INDEX "DiscussionPost_parentId_idx" ON "DiscussionPost"("parentId");
CREATE TABLE "DiscussionReport" (
 "postId" TEXT NOT NULL REFERENCES "DiscussionPost"("id") ON DELETE CASCADE,
 "studentId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("postId","studentId")
);

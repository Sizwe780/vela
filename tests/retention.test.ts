import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import type { Database } from "../lib/ingest/repository";
import { runRetention } from "../lib/account/retention";
import { beforeMonths, deletionDeadline } from "../lib/account/retention-policy";

test("retention calendar clamps month ends and sets 30-day deletion target", () => {
  assert.equal(
    beforeMonths(new Date("2024-03-31T12:00:00Z"), 1).toISOString(),
    "2024-02-29T12:00:00.000Z",
  );
  assert.equal(
    deletionDeadline(new Date("2026-11-27T00:00:00Z")).toISOString(),
    "2026-12-27T00:00:00.000Z",
  );
});
test("isolated retention preview, holds, bounded cleanup and welcome suppression", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      await readFile("prisma/migrations/20261127180000_retention_controls/migration.sql", "utf8"),
    );
    await pg.exec(`
 CREATE TABLE "SupportRequest"(id text,"studentId" text,status text,category text,"createdAt" timestamp,"updatedAt" timestamp);
 CREATE TABLE "DiscussionPost"(id text,"studentId" text,"deletedAt" timestamp);
 CREATE TABLE "DiscussionReport"("postId" text,"studentId" text,"createdAt" timestamp);
 CREATE TABLE "EmailDelivery"(id text,kind text,status text,"studentId" text,"updatedAt" timestamp,"providerMessageId" text,"errorCode" text,"claimedAt" timestamp,attempts int);
 CREATE TABLE "StudyRoomPresence"("studentId" text,"moduleId" text,"expiresAt" timestamp);
 CREATE TABLE "StudyPresence"("studentId" text,"lastPulseAt" timestamp);
 CREATE TABLE "StudentProfile"("studentId" text,"createdAt" timestamp,"updatedAt" timestamp);
 CREATE TABLE "StudyPosition"("studentId" text,"updatedAt" timestamp);
 CREATE TABLE "StudyActivityDay"("studentId" text,"updatedAt" timestamp);
 CREATE TABLE "StudyNote"("studentId" text,"updatedAt" timestamp);
 CREATE TABLE "QuizAttempt"("studentId" text,"createdAt" timestamp);
 INSERT INTO "SupportRequest" VALUES ('old','a','resolved','technical','2020-01-01','2020-01-01'),('held','b','resolved','technical','2020-01-01','2020-01-01'),('open','c','open','deletion','2026-01-01','2026-01-01');
 INSERT INTO "RetentionHold"(id,scope,"targetId",reason,"createdBy") VALUES ('hold','account','b','Documented legal hold','operator');
 INSERT INTO "EmailDelivery" VALUES ('welcome','welcome','sent','a','2020-01-01','diagnostic',NULL,NULL,1),('recall','recall','sent','a','2020-01-01','diagnostic',NULL,NULL,1),('pending','recall','pending','a','2020-01-01',NULL,NULL,NULL,0);
 INSERT INTO "DiscussionPost" VALUES ('live','a',NULL),('removed','a','2020-01-01');
 INSERT INTO "DiscussionReport" VALUES ('live','b','2020-01-01'),('removed','a','2020-01-01');
 INSERT INTO "StudentProfile" VALUES ('inactive','2020-01-01','2020-01-01');
 `);
    const query = async <T>(s: Prisma.Sql) => (await pg.query<T>(s.text, s.values)).rows;
    const db: Database = {
      query,
      transaction: (action) =>
        pg.transaction((tx) =>
          action({ query: async <T>(s: Prisma.Sql) => (await tx.query<T>(s.text, s.values)).rows }),
        ),
    };
    const now = new Date("2026-11-27T12:00:00Z");
    const preview = await runRetention(db, "operator", false, now);
    assert.equal(preview.counts.support, 1);
    assert.equal(preview.counts.delivery, 1);
    assert.equal(preview.counts.welcome, 1);
    assert.equal(preview.deletionRequests[0].overdue, true);
    assert.equal((await pg.query('SELECT * FROM "SupportRequest"')).rows.length, 3);
    const applied = await runRetention(db, "operator", true, now);
    assert.equal(applied.deleted.support, 1);
    assert.equal(applied.deleted.welcomeMetadata, 1);
    assert.deepEqual(
      (await pg.query<{ id: string }>('SELECT id FROM "EmailDelivery" ORDER BY id')).rows.map(
        (r) => r.id,
      ),
      ["pending", "welcome"],
    );
    assert.equal(
      (
        await pg.query<{ providerMessageId: string | null }>(
          'SELECT "providerMessageId" FROM "EmailDelivery" WHERE id=\'welcome\'',
        )
      ).rows[0].providerMessageId,
      null,
    );
    assert.equal((await pg.query('SELECT * FROM "StudentProfile"')).rows.length, 1);
    assert.equal((await pg.query('SELECT * FROM "DiscussionReport"')).rows.length, 1);
    assert.equal((await runRetention(db, "operator", false, now)).counts.welcome, 0);
  } finally {
    await pg.close();
  }
});
import { nextRecall } from "../lib/recall/schedule";
import { clipNote, noteInput } from "../lib/notes/input";
import { buildTutorPrompt } from "../lib/tutor/prompt";
test("notes reject identity overrides, oversized drafts and invalid revisions", () => {
  const valid = { studyUnitId: "unit", body: "My own notes", revision: 0 };
  assert.ok(noteInput.safeParse(valid).success);
  for (const data of [
    { ...valid, studentId: "another-user" },
    { ...valid, revision: -1 },
    { ...valid, revision: 0.5 },
    { ...valid, body: "x".repeat(16001) },
  ])
    assert.equal(noteInput.safeParse(data).success, false);
  const math = String.raw`$$\lim_{x\to2}\frac{x^2-4}{x-2}=4$$`;
  assert.equal(clipNote("Existing", "Derivation", math), `Existing\n\n## Derivation\n\n${math}`);
});
test("Again resets to ten minutes; Good and Easy expand bounded review intervals", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  assert.equal(nextRecall(0, null, now).getTime() - now.getTime(), 600000);
  assert.equal(nextRecall(0.7, null, now).getTime() - now.getTime(), 86400000);
  const previous = { lastAssessedAt: now, nextReviewAt: new Date(now.getTime() + 3 * 86400000) };
  assert.equal(nextRecall(1, previous, now).getTime() - now.getTime(), 7.5 * 86400000);
  assert.equal(nextRecall(0, previous, now).getTime() - now.getTime(), 600000);
  assert.throws(() => nextRecall(NaN, null, now));
  assert.throws(() => nextRecall(1.1, null, now));
});
test("both tutor modes use Vela scaffolding without weakening evidence rules", () => {
  for (const mode of ["academic", "pck"] as const) {
    const prompt = buildTutorPrompt(mode, [], "unit");
    for (const rule of [
      "Intuition First",
      "Multi-Layered Scaffolding",
      "Pause and Predict",
      "Do not echo long",
      "Never invent",
    ])
      assert.ok(prompt.includes(rule));
  }
});

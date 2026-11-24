import { test } from "node:test";
import assert from "node:assert/strict";
import { discussionParagraphs, sourceDigest } from "../lib/social/paragraphs";
import { normalizeParagraph } from "../lib/social/text";
import { pomodoro } from "../lib/social/common";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
test("paragraph anchors cover visible prose/questions, exclude hidden answers, and change on revision", () => {
  const text =
    "## A heading\n\nAn original paragraph explains a concept through a concrete situation.\n\n:::exercise Predict\nWhich assumption changes when the context changes?\n:::answer\nSECRET_HIDDEN_SOLUTION should never become a discussion anchor.\n:::end";
  const paragraphs = discussionParagraphs(text, "s:1");
  assert.equal(paragraphs.length, 2);
  assert.ok(!JSON.stringify(paragraphs).includes("SECRET_HIDDEN"));
  assert.notEqual(paragraphs[0].anchor, discussionParagraphs(text, "s:2")[0].anchor);
  assert.notEqual(
    paragraphs[0].anchor,
    discussionParagraphs(text.replace("original", "changed"), "s:1")[0].anchor,
  );
  assert.equal(
    discussionParagraphs(":::exercise Broken\nquestion\n:::answer\nsecret", "s:1").length,
    0,
  );
  assert.equal(normalizeParagraph("A  sentence\n here"), "A sentence here");
  assert.equal(sourceDigest("source").length, 64);
});
test("shared Pomodoro uses exact UTC cycle boundaries without awarding time or mastery", () => {
  assert.deepEqual(pomodoro(0), { phase: "Focus", remainingMs: 1500000 });
  assert.deepEqual(pomodoro(1500000), { phase: "Break", remainingMs: 300000 });
  assert.deepEqual(pomodoro(1800000), pomodoro(0));
  assert.deepEqual(pomodoro(86400000 + 1234), pomodoro(1234));
});
test("social tables enforce one presence per learner/module, reports deduplicate and source hashes are bounded", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'CREATE TABLE "Module"(id TEXT PRIMARY KEY);CREATE TABLE "StudyUnit"(id TEXT PRIMARY KEY);INSERT INTO "Module" VALUES(\'m\');INSERT INTO "StudyUnit" VALUES(\'u\');',
    );
    await db.exec(
      await readFile("prisma/migrations/20261118150000_social_learning/migration.sql", "utf8"),
    );
    await db.exec("INSERT INTO \"StudyRoomPresence\" VALUES('student','m','tab',now());");
    await assert.rejects(
      db.exec("INSERT INTO \"StudyRoomPresence\" VALUES('student','m','other-tab',now());"),
    );
    await db.query(
      'INSERT INTO "DiscussionPost"(id,"studentId","studyUnitId","sourceType","sourceId","sourceHash",anchor,body) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      ["p", "student", "u", "session", "s", "a".repeat(64), "b".repeat(64), "Question"],
    );
    await db.exec('INSERT INTO "DiscussionReport"("postId","studentId") VALUES(\'p\',\'peer\');');
    await assert.rejects(
      db.exec('INSERT INTO "DiscussionReport"("postId","studentId") VALUES(\'p\',\'peer\');'),
    );
  } finally {
    await db.close();
  }
});

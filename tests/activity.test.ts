import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { activityInput } from "../lib/activity/input";
import { activitySummary, allocateStudyTime, studyDay, weekStart } from "../lib/activity/time";
test("timer input cannot supply identity, durations or recording dates", () => {
  const valid = {
    action: "pulse",
    trackingId: "00000000-0000-4000-8000-000000000001",
    sessionId: "session-1",
  };
  assert.ok(activityInput.safeParse(valid).success);
  for (const extra of [
    { studentId: "other" },
    { seconds: 86400 },
    { day: "2026-11-17" },
    { trackingId: "not-a-uuid" },
    { action: "award" },
  ])
    assert.equal(activityInput.safeParse({ ...valid, ...extra }).success, false);
});
test("server time credit is bounded and expired or backward heartbeats earn nothing", () => {
  const previous = new Date("2026-11-18T08:00:00Z");
  assert.deepEqual(allocateStudyTime(previous, new Date("2026-11-18T08:00:05Z")), [
    { day: "2026-11-18", seconds: 5 },
  ]);
  assert.deepEqual(allocateStudyTime(previous, new Date("2026-11-18T08:00:15Z")), [
    { day: "2026-11-18", seconds: 10 },
  ]);
  assert.deepEqual(allocateStudyTime(previous, new Date("2026-11-18T08:00:16Z")), []);
  assert.deepEqual(allocateStudyTime(previous, new Date("2026-11-18T08:01:00Z")), []);
  assert.deepEqual(allocateStudyTime(previous, new Date("2026-11-18T07:59:59Z")), []);
});
test("study credit splits exactly across South African midnight", () => {
  assert.deepEqual(
    allocateStudyTime(new Date("2026-11-17T21:59:57Z"), new Date("2026-11-17T22:00:05Z")),
    [
      { day: "2026-11-17", seconds: 3 },
      { day: "2026-11-18", seconds: 5 },
    ],
  );
  assert.equal(studyDay(new Date("2026-11-17T22:00:00Z")), "2026-11-18");
  assert.equal(weekStart("2026-11-22"), "2026-11-16");
  assert.equal(weekStart("2026-11-23"), "2026-11-23");
});
test("weekly goals aggregate modules while streaks require a recorded minute", () => {
  const rows = [
    { day: "2026-11-16", seconds: 60 },
    { day: "2026-11-17", seconds: 30 },
    { day: "2026-11-17", seconds: 30 },
    { day: "2026-11-18", seconds: 20 },
  ];
  const result = activitySummary(rows, new Date("2026-11-18T08:00:00Z"), 15);
  assert.equal(result.weekSeconds, 140);
  assert.equal(result.streakDays, 2);
  assert.equal(result.days.length, 7);
  assert.equal(result.goalPercent, 15);
  assert.equal(
    activitySummary([{ day: "2026-11-18", seconds: 10000 }], new Date("2026-11-18T08:00:00Z"), 15)
      .goalPercent,
    100,
  );
});
test("activity migration enforces one presence per learner and non-negative daily counts", async () => {
  const pg = new PGlite();
  try {
    await pg.exec('CREATE TABLE "Module"(id TEXT PRIMARY KEY); INSERT INTO "Module" VALUES(\'m\')');
    await pg.exec(
      await readFile("prisma/migrations/20261118100000_study_activity/migration.sql", "utf8"),
    );
    await pg.exec(`INSERT INTO "StudyPresence" VALUES('student','tab-a','session',now())`);
    await assert.rejects(
      pg.exec(`INSERT INTO "StudyPresence" VALUES('student','tab-b','session',now())`),
    );
    await assert.rejects(
      pg.exec(
        `INSERT INTO "StudyActivityDay"("studentId",day,"moduleId",seconds) VALUES('student','2026-11-18','m',-1)`,
      ),
    );
    await pg.exec(
      `INSERT INTO "StudyActivityDay"("studentId",day,"moduleId",seconds) VALUES('student','2026-11-18','m',30)`,
    );
    await assert.rejects(
      pg.exec(
        `INSERT INTO "StudyActivityDay"("studentId",day,"moduleId",seconds) VALUES('student','2026-11-18','m',30)`,
      ),
    );
  } finally {
    await pg.close();
  }
});

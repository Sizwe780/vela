import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { practiceSnapshot, notebookInput } from "../lib/math-practice/notebook";
const operation = { kind: "add", source: 1, target: 2, factor: "-2" };
const snapshot = {
  version: 1,
  reference: "(x+1)^2",
  draft: "",
  mode: "expression",
  variable: "x",
  matrix: false,
  operation,
  context: "My own example",
  lines: [{ latex: "x^2+2x+1", operation }],
};
test("practice snapshots contain inputs, not claimed feedback or hidden answer keys", () => {
  assert.equal(practiceSnapshot.safeParse(snapshot).success, true);
  for (const injected of [{ score: 1 }, { answer: "42" }, { feedback: { status: "equivalent" } }])
    assert.equal(practiceSnapshot.safeParse({ ...snapshot, ...injected }).success, false);
  assert.equal(
    practiceSnapshot.safeParse({
      ...snapshot,
      lines: [{ ...snapshot.lines[0], feedback: "verified" }],
    }).success,
    false,
  );
  assert.equal(
    practiceSnapshot.safeParse({ ...snapshot, reference: "\\href{https://example.com}{x}" })
      .success,
    false,
  );
  assert.equal(
    practiceSnapshot.safeParse({ ...snapshot, lines: Array(21).fill(snapshot.lines[0]) }).success,
    false,
  );
  assert.equal(
    practiceSnapshot.safeParse({ ...snapshot, operation: { ...operation, source: 10 } }).success,
    false,
  );
  assert.equal(practiceSnapshot.safeParse({ ...snapshot, version: 2 }).success, false);
  const entry = {
    id: "00c1c664-3f4c-4c86-8e2c-a9b76cf8764a",
    ownerId: "student",
    title: "  Check a sign  ",
    reflection: "I forgot a minus sign.",
    kind: "mistake",
    snapshot,
  };
  assert.equal(notebookInput.parse(entry).title, "Check a sign");
  assert.equal(notebookInput.safeParse({ ...entry, studentId: "other" }).success, false);
  assert.equal(notebookInput.safeParse({ ...entry, title: " " }).success, false);
});
test("notebook migration bounds stored data without linking practice to mastery", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      await readFile("prisma/migrations/20261118130000_practice_notebook/migration.sql", "utf8"),
    );
    await pg.query(
      'INSERT INTO "PracticeNotebook" (id,"studentId",title,kind,snapshot) VALUES ($1,$2,$3,$4,$5)',
      ["entry", "owner", "My attempt", "mistake", snapshot],
    );
    const result = await pg.query('SELECT title FROM "PracticeNotebook" WHERE "studentId"=$1', [
      "other",
    ]);
    assert.equal(result.rows.length, 0);
    await assert.rejects(
      pg.query(
        'INSERT INTO "PracticeNotebook" (id,"studentId",title,kind,snapshot) VALUES ($1,$2,$3,$4,$5)',
        ["bad", "owner", "My attempt", "grade", snapshot],
      ),
    );
    await assert.rejects(
      pg.query(
        'INSERT INTO "PracticeNotebook" (id,"studentId",title,snapshot) VALUES ($1,$2,$3,$4)',
        ["large", "owner", "My attempt", { data: "x".repeat(66000) }],
      ),
    );
  } finally {
    await pg.close();
  }
});

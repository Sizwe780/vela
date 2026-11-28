import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { saveAttempt, attemptInput, checkedDraft, exerciseKey } from "../lib/practice/attempts";
import type { Database } from "../lib/ingest/repository";
import { physicsPracticeChecks } from "../content/physics/practice-checks";
import {
  elements,
  elementsBySymbol,
  molarMass,
  fullConfiguration,
  categoryKey,
} from "../lib/references/elements";
import { formatElectronConfiguration, formatIsotopeNotation } from "../lib/references/notation";
import { formulas } from "../lib/references/formulas";
import { convertReference, constants } from "../lib/references/constants";
import { mathSpans } from "../lib/content/math";
import { syntheticQualification } from "../lib/enrollment/catalog-visibility";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Markdown } from "../components/markdown";

test("118 element positions, electron configurations and formula mass are coherent", () => {
  assert.equal(elements.length, 118);
  assert.equal(new Set(elements.map((e) => e.z)).size, 118);
  assert.equal(new Set(elements.map((e) => e.row + ":" + e.column)).size, 118);
  for (const e of elements) {
    assert.ok(e.column >= 1 && e.column <= 18);
    const electrons = [...fullConfiguration(e).matchAll(/\d[spdf](\d+)/g)].reduce(
      (s, m) => s + Number(m[1]),
      0,
    );
    assert.equal(electrons, e.z, e.symbol);
  }
  assert.ok(Math.abs(molarMass("H2O").total - 18.015) < 0.005);
  assert.ok(Math.abs(molarMass("CaCO3").total - 100.086) < 0.01);
  assert.ok(Math.abs(molarMass("CuSO4·5H2O").total - 249.68) < 0.1);
  const result = molarMass("Ca(NO3)2");
  assert.ok(Math.abs(result.composition.reduce((s, r) => s + r.percent, 0) - 100) < 1e-9);
  assert.equal(molarMass("H₂O").total, molarMass("H2O").total);
  for (const invalid of ["2H2O", "Xx2", "H0", "Ca(NO3", "H2O<script>", "H2O.0H2O"]) {
    assert.throws(() => molarMass(invalid), invalid);
  }
});
test("CIAAW precision, isotope notation and independent category/block/group classifications", () => {
  const ar = elementsBySymbol.get("Ar")!,
    zn = elementsBySymbol.get("Zn")!;
  assert.equal(ar.weight, "39.95");
  assert.equal(ar.standardWeight, "[39.792,39.963]");
  assert.equal(ar.weightUncertainty, "0.16");
  assert.equal(zn.weight, "65.38");
  assert.equal(zn.standardWeight, "65.38(2)");
  assert.ok(Math.abs(molarMass("ZnO").total - 81.379) < 1e-9);
  assert.equal(elementsBySymbol.get("Li")!.weight, "6.94");
  assert.equal(elements.filter((e) => e.standardWeight).length, 84);
  assert.equal(elementsBySymbol.get("Tc")!.weight, "—");
  assert.throws(() => molarMass("TcCl4"), /isotope-specific/);
  assert.equal(formatElectronConfiguration("1s1"), "1s¹");
  assert.equal(formatElectronConfiguration("[Ar]4s2 3d10"), "[Ar]4s² 3d¹⁰");
  assert.equal(formatIsotopeNotation("1H, 2H, 12C, 238U"), "¹H, ²H, ¹²C, ²³⁸U");
  for (const [symbol, category, block, group] of [
    ["H", "Nonmetal", "s", 1],
    ["He", "Noble gas", "s", 18],
    ["Cu", "Transition metal", "d", 11],
    ["Zn", "Group 12 metal", "d", 12],
    ["Cd", "Group 12 metal", "d", 12],
    ["Hg", "Group 12 metal", "d", 12],
    ["Ga", "Post-transition metal", "p", 13],
    ["Al", "Post-transition metal", "p", 13],
    ["Ge", "Metalloid", "p", 14],
  ] as const) {
    const e = elementsBySymbol.get(symbol)!;
    assert.equal(e.category, category, symbol);
    assert.equal(e.block, block, symbol);
    assert.equal(e.group, group, symbol);
  }
  for (const e of elements) {
    assert.ok(categoryKey(e.category).length > 0);
    if (e.block === "f") {
      assert.equal(e.group, null);
      assert.ok(e.row >= 9);
    } else if (e.block === "d") assert.ok(e.group! >= 3 && e.group! <= 12);
  }
});
test("reference conversions and formula conditions avoid math rendering corruption", () => {
  assert.equal(convertReference(1, "atm", "kPa", "pressure"), 101.325);
  assert.equal(convertReference(1000, "cm³", "L", "volume"), 1);
  assert.ok(Math.abs(convertReference(180, "deg", "rad", "angle") - Math.PI) < 1e-12);
  assert.equal(convertReference(1, "eV", "J", "energy"), 1.602176634e-19);
  assert.throws(() => convertReference(1, "J", "L", "energy"));
  assert.equal(constants.find((c) => c.symbol === "g_n")?.basis.includes("not local"), true);
  for (const f of formulas) assert.doesNotThrow(() => mathSpans("$$\n" + f.latex + "\n$$"), f.name);
  for (const source of [
    String.raw`$x^2+y=9$`,
    String.raw`$\begin{bmatrix}3&0&8\\-2&5&1\end{bmatrix}$`,
    String.raw`$\ce{H2(g) + O2(g) -> H2O(l)}$`,
  ]) {
    const html = renderToStaticMarkup(createElement(Markdown, { text: source }));
    assert.ok(!html.includes("<table"));
    assert.ok(!html.includes("katex-error"));
    assert.equal((html.match(/class="katex"/g) || []).length, 1);
    assert.ok(html.includes("katex-mathml"));
    assert.ok(html.includes("katex-html"));
  }
});
test("synthetic catalog markers are excluded without matching real names accidentally", () => {
  for (const q of [
    { code: "QA-CONCEPT" },
    { code: "QA 123" },
    { code: "90104", title: "Synthetic only" },
    { code: "TEST", streamTitle: "Isolated scaffold QA" },
  ])
    assert.ok(syntheticQualification(q));
  for (const q of [
    { code: "90104", title: "Education" },
    { code: "QATAR", institution: "Qatar" },
  ])
    assert.ok(!syntheticQualification(q));
});
test("saved formative practice enforces owner, version, canonical exercise and revision without grading writes", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      `CREATE TABLE "StudentProfile"("studentId" text PRIMARY KEY); CREATE TABLE "StudySession"(id text PRIMARY KEY); INSERT INTO "StudySession" VALUES ('s');`,
    );
    await pg.exec(
      await readFile("prisma/migrations/20261127200000_lesson_attempts/migration.sql", "utf8"),
    );
    await pg.exec(
      await readFile(
        "prisma/migrations/20261127210000_attempt_submission_history/migration.sql",
        "utf8",
      ),
    );
    const db: Database = {
      query: async <T>(s: Prisma.Sql) => (await pg.query<T>(s.text, s.values)).rows,
      transaction: (action) =>
        pg.transaction((tx) =>
          action({ query: async <T>(s: Prisma.Sql) => (await tx.query<T>(s.text, s.values)).rows }),
        ),
    };
    const [question, spec] = Object.entries(physicsPracticeChecks).find(
      ([, s]) => s.kind === "quantity",
    )!;
    if (spec.kind !== "quantity") throw Error();
    const session = {
      version: 1,
      markdown: `:::exercise Check\n${question}\n:::answer\nWorked reference\n:::end`,
    };
    const draft = {
      values: Object.fromEntries(spec.fields.map((f, i) => [i, String(f.value)])),
      units: Object.fromEntries(spec.fields.map((f, i) => [i, f.unit])),
    };
    const input = {
      ownerId: "a",
      studyUnitId: "u",
      sessionId: "s",
      version: 1,
      title: "Check",
      question,
      draft,
      submitted: true,
      revision: 0,
    };
    assert.ok(checkedDraft(question, draft));
    assert.equal(attemptInput.safeParse({ ...input, isLocallyChecked: true }).success, false);
    const first = await saveAttempt(db, "a", input, session);
    assert.equal(first.isLocallyChecked, true);
    assert.equal(first.revision, 1);
    const restored = (await pg.query<any>(`SELECT * FROM "LessonAttempt" WHERE "studentId"='a'`))
      .rows[0];
    assert.deepEqual(restored.userAnswer, draft);
    await assert.rejects(() => saveAttempt(db, "a", input, session), /another tab/);
    await assert.rejects(
      () => saveAttempt(db, "b", input, session),
      /account changed|Sign in again/i,
    );
    await assert.rejects(() => saveAttempt(db, "a", { ...input, version: 2 }, session), /version/);
    await assert.rejects(
      () => saveAttempt(db, "a", { ...input, question: "Different" }, session),
      /question changed/i,
    );
    await saveAttempt(
      db,
      "a",
      { ...input, revision: first.revision, draft: { values: { 0: "99999" }, units: { 0: "m" } } },
      session,
    );
    const history = (
      await pg.query<any>('SELECT * FROM "LessonAttemptSubmission" ORDER BY "createdAt"')
    ).rows;
    assert.equal(history.length, 2);
    assert.equal(history[0].isLocallyChecked, true);
    assert.equal(history[1].isLocallyChecked, false);
    await saveAttempt(db, "b", { ...input, ownerId: "b" }, session);
    assert.equal((await pg.query('SELECT * FROM "LessonAttempt"')).rows.length, 2);
    assert.notEqual(exerciseKey("A", "bc"), exerciseKey("Ab", "c"));
  } finally {
    await pg.close();
  }
});

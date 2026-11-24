import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import type { Database } from "../lib/ingest/repository";
import { updateBKT } from "../lib/learning/bkt";
import {
  conceptGraph,
  validateConceptGraph,
  conceptModelVersion,
  conceptParameters,
} from "../lib/learning/graph";
import { conceptProblem } from "../lib/learning/problems";
import { createConceptEngine } from "../lib/learning/engine";
import { availabilitySchema, studyPeriods } from "../lib/learning/schedule";
import { mathSpans } from "../lib/content/math";
import { checkMathStep } from "../lib/math-practice/checker";
import { localGrammarSchema, decodeCoachJSON } from "../lib/coach/ai";
import { z } from "zod";

test("BKT uses explicit correct/incorrect evidence without turning the prior into an observation", () => {
  const p = conceptGraph.parameters,
    right = updateBKT(0.2, true, p),
    wrong = updateBKT(0.2, false, p);
  assert.ok(Math.abs(right.posterior - 9 / 19) < 1e-12);
  assert.ok(Math.abs(right.probability - (9 / 19 + (10 / 19) * 0.1)) < 1e-12);
  assert.ok(Math.abs(wrong.posterior - 1 / 31) < 1e-12);
  assert.ok(wrong.probability < 0.2);
  for (const prior of [NaN, -0.1, 1.1, Infinity]) assert.throws(() => updateBKT(prior, true, p));
  assert.throws(() => updateBKT(0.2, true, { ...p, guess: 0.95 }));
});
test("concept graph rejects cycles, missing prerequisites and duplicate identities", () => {
  const clone = () => structuredClone(conceptGraph),
    cyclic = clone();
  cyclic.nodes[0].prerequisites = [cyclic.nodes[0].id];
  assert.throws(() => validateConceptGraph(cyclic), /cycle/);
  const unknown = clone();
  unknown.nodes[0].prerequisites = ["missing"];
  assert.throws(() => validateConceptGraph(unknown), /Unknown/);
  const duplicated = clone();
  duplicated.nodes.push(duplicated.nodes[0]);
  assert.throws(() => validateConceptGraph(duplicated), /Duplicate/);
  assert.notEqual(
    conceptModelVersion(conceptGraph.nodes[0]),
    conceptModelVersion({ ...conceptGraph.nodes[0], version: 2 }),
  );
});
test("reviewed concept parameters override defaults and version the evidence model", () => {
  const original = conceptGraph.nodes[0],
    custom = { ...original, parameters: { ...conceptGraph.parameters, slip: 0.2 } };
  assert.equal(conceptParameters(custom).slip, 0.2);
  assert.notEqual(conceptModelVersion(original), conceptModelVersion(custom));
});
test("all starter refreshers and parameterized probes preserve valid math and unique choices", () => {
  for (const node of conceptGraph.nodes) {
    mathSpans(node.refresher);
    const items = new Set<string>();
    for (let seed = 0; seed < 120; seed++) {
      const p = conceptProblem(node.probeKind, seed);
      mathSpans(p.prompt);
      mathSpans(p.explanation);
      for (const option of p.options) mathSpans(option.text);
      assert.equal(new Set(p.options.map((o) => o.text)).size, 4);
      assert.ok(p.options.some((o) => o.id === p.correctId));
      items.add(p.itemKey);
    }
    assert.ok(items.size > 5, node.id);
  }
});
test("independent CAS agrees with derivative/chain answer keys and rejects distractors", async () => {
  for (const kind of ["derivative", "chain"] as const)
    for (const seed of [3, 12, 27]) {
      const q = conceptProblem(kind, seed),
        reference = q.prompt.match(/f\(x\)=(.*?)\$\./)![1];
      for (const o of q.options) {
        const result = await checkMathStep({
          kind: "symbolic",
          reference,
          next: o.text.replace(/^\$|\$$/g, ""),
          mode: "derivative",
          variable: "x",
        });
        assert.equal(
          result.status,
          o.id === q.correctId ? "equivalent" : "not-equivalent",
          q.prompt + o.text,
        );
      }
    }
});
test("study periods use only entered future slots and reject overlap", () => {
  const now = new Date("2026-11-19T08:00:00Z"),
    slots = [
      { startAt: "2026-11-19T10:00:00+02:00", minutes: 15 },
      { startAt: "2026-11-19T10:30:00+02:00", minutes: 45 },
    ];
  assert.equal(availabilitySchema.safeParse(slots).success, true);
  assert.equal(studyPeriods(slots, now)[1].minutes, 25);
  assert.equal(studyPeriods(slots, new Date("2026-11-19T09:00:00Z")).length, 0);
  assert.equal(
    availabilitySchema.safeParse([slots[0], { startAt: "2026-11-19T08:05:00Z", minutes: 30 }])
      .success,
    false,
  );
});
test("local grammar compatibility retains application length checks", () => {
  const schema = {
    type: "object",
    properties: { answer: { type: "string", maxLength: 2600 } },
    required: ["answer"],
  };
  assert.deepEqual(localGrammarSchema(schema), {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
  });
  assert.throws(() =>
    decodeCoachJSON(
      z.object({ answer: z.string().max(3) }),
      JSON.stringify({ answer: "too long" }),
    ),
  );
});
let pg: PGlite, db: Database;
before(async () => {
  pg = new PGlite();
  await pg.exec(
    "CREATE TABLE \"Module\"(id TEXT PRIMARY KEY);CREATE TABLE \"StudyUnit\"(id TEXT PRIMARY KEY,\"moduleId\" TEXT);CREATE TABLE \"Enrollment\"(\"studentId\" TEXT,\"moduleId\" TEXT,status TEXT);INSERT INTO \"Module\" VALUES ('m');INSERT INTO \"StudyUnit\" VALUES('u','m');INSERT INTO \"Enrollment\" VALUES('a','m','active'),('b','m','active');",
  );
  await pg.exec(
    await readFile("prisma/migrations/20261119010000_concept_learning/migration.sql", "utf8"),
  );
  db = {
    query: async <T>(s: Prisma.Sql) => (await pg.query<T>(s.text, s.values)).rows,
    transaction: (fn) =>
      pg.transaction((tx) =>
        fn({ query: async <T>(s: Prisma.Sql) => (await tx.query<T>(s.text, s.values)).rows }),
      ),
  };
});
after(async () => {
  await pg?.close();
});
test("concept checks are owner-bound, idempotent and update only the assessed node", async () => {
  const engine = createConceptEngine(db),
    node = conceptGraph.nodes[0],
    q = await engine.issue("a", node, "m", "u");
  assert.ok(!JSON.stringify(q).includes("correctId"));
  assert.equal((await engine.issue("a", node, "m", "u")).id, q.id);
  const [stored] = (
    await pg.query<{ payload: { correctId: string } }>(
      'SELECT payload FROM "ConceptCheck" WHERE id=$1',
      [q.id],
    )
  ).rows;
  await assert.rejects(engine.submit("b", q.id, stored.payload.correctId));
  const first = await engine.submit("a", q.id, stored.payload.correctId);
  assert.deepEqual(await engine.submit("a", q.id, "a"), first);
  const rows = (
    await pg.query<{ conceptId: string; observations: number }>(
      'SELECT "conceptId",observations FROM "LearningConceptState" WHERE "studentId"=\'a\'',
    )
  ).rows;
  assert.deepEqual(rows, [{ conceptId: node.id, observations: 1 }]);
  const again = await engine.issue("a", node, "m", "u");
  await pg.query(
    'UPDATE "ConceptCheck" SET payload=(SELECT payload FROM "ConceptCheck" WHERE id=$1),"itemKey"=(SELECT "itemKey" FROM "ConceptCheck" WHERE id=$1) WHERE id=$2',
    [q.id, again.id],
  );
  const repeated = (await engine.submit("a", again.id, stored.payload.correctId)) as {
    credited: boolean;
  };
  assert.equal(repeated.credited, false);
});
test("failed result writes roll back estimates; withdrawal and expiry prevent grading", async () => {
  const engine = createConceptEngine(db),
    node = conceptGraph.nodes[1],
    q = await engine.issue("b", node, "m", "u");
  const broken = createConceptEngine({
    ...db,
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          query: (s) => {
            if (s.text.startsWith('UPDATE "ConceptCheck"')) throw Error("Injected save failure");
            return tx.query(s);
          },
        }),
      ),
  });
  await assert.rejects(broken.submit("b", q.id, "a"));
  assert.equal(
    (
      await pg.query<{ n: number }>(
        'SELECT count(*)::int n FROM "LearningConceptState" WHERE "studentId"=\'b\'',
      )
    ).rows[0].n,
    0,
  );
  await pg.exec("UPDATE \"Enrollment\" SET status='withdrawn' WHERE \"studentId\"='b'");
  await assert.rejects(engine.submit("b", q.id, "a"));
  await pg.exec("UPDATE \"Enrollment\" SET status='active' WHERE \"studentId\"='b'");
  await pg.query('UPDATE "ConceptCheck" SET "expiresAt"=now()-interval \'1 minute\' WHERE id=$1', [
    q.id,
  ]);
  await assert.rejects(engine.submit("b", q.id, "a"));
});

test("Cloudflare daily allowance failures remain explicit and never return an invented vector", async () => {
  const { embedTokens } = await import("../lib/ingest/embeddings");
  const { IngestError } = await import("../lib/ingest/errors");
  const original = globalThis.fetch,
    oldAccount = process.env.CLOUDFLARE_ACCOUNT_ID,
    oldKey = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_ACCOUNT_ID = "a".repeat(32);
  process.env.CLOUDFLARE_API_TOKEN = "synthetic-token-for-unit-test";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ errors: [{ code: 4006, message: "Daily allowance exhausted" }] }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  try {
    await assert.rejects(
      embedTokens([[1]], { purpose: "query", texts: ["a concept"], provider: "cloudflare" }),
      (e) => e instanceof IngestError && e.code === "AI_ALLOWANCE" && e.status === 503,
    );
  } finally {
    globalThis.fetch = original;
    if (oldAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = oldAccount;
    if (oldKey === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = oldKey;
  }
});

import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const codes = ["MAT1503", "MAT1512", "BPT1501", "CHE1501", "PHY1503", "PHY1505", "TPS2601"];
const apply = process.argv.includes("--apply");
if (process.argv.slice(2).some((arg) => arg !== "--apply"))
  throw new Error("Use --apply or run without arguments for a plan.");
function pool(value) {
  const url = new URL(value);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 30000,
  });
}
const source = pool(process.env.PROMOTE_SOURCE_URL);
const target = pool(process.env.PROMOTE_TARGET_URL);
const quoted = (name) => '"' + name.replaceAll('"', '""') + '"';
async function snapshot(db) {
  const modules = (
    await db.query("SELECT * FROM \"Module\" WHERE institution='UNISA' AND code=ANY($1)", [codes])
  ).rows;
  const units = (
    await db.query('SELECT * FROM "StudyUnit" WHERE "moduleId"=ANY($1)', [modules.map((r) => r.id)])
  ).rows;
  const sessions = (
    await db.query('SELECT * FROM "StudySession" WHERE "studyUnitId"=ANY($1)', [
      units.map((r) => r.id),
    ])
  ).rows;
  const outcomes = (
    await db.query('SELECT * FROM "LearningOutcome" WHERE "studyUnitId"=ANY($1)', [
      units.map((r) => r.id),
    ])
  ).rows;
  const links = (
    await db.query('SELECT * FROM "_OutcomeCriteria" WHERE "B"=ANY($1)', [
      outcomes.map((r) => r.id),
    ])
  ).rows;
  const criteria = (
    await db.query('SELECT * FROM "AssessmentCriterion" WHERE id=ANY($1)', [links.map((r) => r.A)])
  ).rows;
  const qualifications = (
    await db.query('SELECT * FROM "Qualification" WHERE id=ANY($1)', [
      criteria.map((r) => r.qualificationId),
    ])
  ).rows;
  const ingestions = (
    await db.query(
      'SELECT * FROM "Ingestion" WHERE "learningOutcomeId"=ANY($1) AND "sourceName" LIKE \'Vela original / %\' AND "sourceText"=ANY($2)',
      [outcomes.map((r) => r.id), sessions.map((r) => r.markdown)],
    )
  ).rows;
  const chunks = (
    await db.query('SELECT * FROM "ContentChunk" WHERE "ingestionId"=ANY($1)', [
      ingestions.map((r) => r.id),
    ])
  ).rows;
  return {
    modules,
    units,
    sessions,
    outcomes,
    links,
    criteria,
    qualifications,
    ingestions,
    chunks,
  };
}
async function saveRow(db, table, row, conflict, updates) {
  const keys = Object.keys(row);
  const values = keys.map((key) =>
    row[key] !== null && typeof row[key] === "object" && !(row[key] instanceof Date)
      ? JSON.stringify(row[key])
      : row[key],
  );
  await db.query(
    "INSERT INTO " +
      quoted(table) +
      " (" +
      keys.map(quoted).join(",") +
      ") VALUES (" +
      keys.map((_, i) => "$" + (i + 1)).join(",") +
      ") ON CONFLICT (" +
      conflict.map(quoted).join(",") +
      ") " +
      (updates.length
        ? "DO UPDATE SET " + updates.map((k) => quoted(k) + "=EXCLUDED." + quoted(k)).join(",")
        : "DO NOTHING"),
    values,
  );
}
async function main() {
  if (
    new URL(process.env.PROMOTE_SOURCE_URL).hostname !==
    "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech"
  )
    throw new Error("Expected the reviewed staging source");
  if (
    new URL(process.env.PROMOTE_SOURCE_URL).hostname ===
    new URL(process.env.PROMOTE_TARGET_URL).hostname
  )
    throw new Error("Source and destination must differ");
  const [src, before] = await Promise.all([snapshot(source), snapshot(target)]);
  const retired = src.units.find((u) => u.code === "BPT1501-U1");
  if (retired) throw new Error("The source includes retired orientation");
  const index = (rows, key) => new Map(rows.map((row) => [key(row), row]));
  const moduleKey = (r) => r.institution + ":" + r.code;
  const prodModules = index(before.modules, moduleKey);
  const moduleIds = new Map(
    src.modules.map((m) => {
      const found = prodModules.get(moduleKey(m));
      if (!found) throw new Error("Register production module first: " + m.code);
      return [m.id, found.id];
    }),
  );
  const sourceUnitIds = new Set(src.units.map((u) => u.id));
  const selectedSessions = src.sessions.filter((s) => sourceUnitIds.has(s.studyUnitId));
  const unitIds = new Map();
  for (const unit of src.units) {
    const match = before.units.find(
      (p) => p.moduleId === moduleIds.get(unit.moduleId) && p.code === unit.code,
    );
    unitIds.set(unit.id, match?.id ?? unit.id);
    if (
      match &&
      match.id !== unit.id &&
      selectedSessions.some(
        (s) =>
          s.studyUnitId === unit.id &&
          before.sessions.some((p) => p.id === s.id && p.studyUnitId !== match.id),
      )
    ) {
      throw new Error("Session identity conflict: " + unit.code);
    }
  }
  const outcomeIds = new Map(
    src.outcomes.map((o) => [
      o.id,
      before.outcomes.find((p) => p.studyUnitId === unitIds.get(o.studyUnitId) && p.code === o.code)
        ?.id ?? o.id,
    ]),
  );
  const qualIds = new Map();
  const allTargetQualifications = (await target.query('SELECT * FROM "Qualification"')).rows;
  for (const q of src.qualifications) {
    const found = allTargetQualifications.find(
      (p) => p.institution === q.institution && p.code === q.code && p.stream === q.stream,
    );
    if (!found) throw new Error("Missing target qualification");
    qualIds.set(q.id, found.id);
  }
  const criterionIds = new Map(
    src.criteria.map((c) => [
      c.id,
      before.criteria.find(
        (p) => p.qualificationId === qualIds.get(c.qualificationId) && p.code === c.code,
      )?.id ?? c.id,
    ]),
  );
  for (const session of selectedSessions) {
    const match = before.sessions.find(
      (s) => s.studyUnitId === unitIds.get(session.studyUnitId) && s.position === session.position,
    );
    if (match && match.id !== session.id)
      throw new Error("Stable session ID conflict: " + session.id);
  }
  const report = {
    modules: src.modules.length,
    units: src.units.length,
    sessions: selectedSessions.length,
    changedSessions: selectedSessions.filter(
      (s) => before.sessions.find((p) => p.id === s.id)?.markdown !== s.markdown,
    ).length,
    indexedIngestions: src.ingestions.length,
    indexedChunks: src.chunks.length,
    retainedProductionOnlySessions: before.sessions
      .filter((s) => !selectedSessions.some((x) => x.id === s.id))
      .map((s) => s.id),
  };
  console.log(JSON.stringify(report));
  const dir = resolve(
    "../work/production-promotion-" + new Date().toISOString().replaceAll(/[:.]/g, "-"),
  );
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "before.json"), JSON.stringify(before));
  await writeFile(resolve(dir, "source.json"), JSON.stringify(src));
  await writeFile(resolve(dir, "plan.json"), JSON.stringify(report, null, 2));
  console.log("Content backup and plan saved", dir);
  if (!apply) return;
  const db = await target.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await db.query("SET LOCAL statement_timeout = '240s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('vela:content-promotion'))");
    for (const unit of src.units) {
      const samePosition = before.units.find(
        (p) =>
          p.moduleId === moduleIds.get(unit.moduleId) &&
          p.position === unit.position &&
          p.id !== unitIds.get(unit.id),
      );
      if (samePosition) throw new Error("Unit position conflict: " + unit.code);
      await saveRow(
        db,
        "StudyUnit",
        { ...unit, id: unitIds.get(unit.id), moduleId: moduleIds.get(unit.moduleId) },
        ["id"],
        ["title", "position", "updatedAt"],
      );
    }
    for (const criterion of src.criteria)
      await saveRow(
        db,
        "AssessmentCriterion",
        {
          ...criterion,
          id: criterionIds.get(criterion.id),
          qualificationId: qualIds.get(criterion.qualificationId),
        },
        ["id"],
        ["description", "sourceUrl", "authority"],
      );
    for (const outcome of src.outcomes)
      await saveRow(
        db,
        "LearningOutcome",
        {
          ...outcome,
          id: outcomeIds.get(outcome.id),
          studyUnitId: unitIds.get(outcome.studyUnitId),
        },
        ["id"],
        ["description", "position", "updatedAt"],
      );
    for (const link of src.links)
      await saveRow(
        db,
        "_OutcomeCriteria",
        { A: criterionIds.get(link.A), B: outcomeIds.get(link.B) },
        ["A", "B"],
        [],
      );
    for (const session of selectedSessions) {
      const current = (
        await db.query('SELECT * FROM "StudySession" WHERE id=$1 FOR UPDATE', [session.id])
      ).rows[0];
      const prior = before.sessions.find((p) => p.id === session.id);
      if (
        current &&
        (!prior || current.markdown !== prior.markdown || current.version !== prior.version)
      )
        throw new Error("Production lesson changed during preparation: " + session.id);
      const changed =
        !current ||
        current.markdown !== session.markdown ||
        current.title !== session.title ||
        JSON.stringify(current.concepts) !== JSON.stringify(session.concepts);
      await saveRow(
        db,
        "StudySession",
        {
          ...session,
          studyUnitId: unitIds.get(session.studyUnitId),
          version: current ? current.version + Number(changed) : session.version,
        },
        ["id"],
        ["title", "markdown", "visual", "concepts", "version"],
      );
    }
    for (const ingestion of src.ingestions) {
      await saveRow(
        db,
        "Ingestion",
        {
          ...ingestion,
          learningOutcomeId: outcomeIds.get(ingestion.learningOutcomeId),
          assessmentCriterionId: criterionIds.get(ingestion.assessmentCriterionId),
        },
        ["id"],
        [],
      );
    }
    const positions = new Map();
    for (const chunk of src.chunks) {
      const outcome = outcomeIds.get(chunk.learningOutcomeId);
      const exists = (
        await db.query('SELECT id,position FROM "ContentChunk" WHERE id=$1', [chunk.id])
      ).rows[0];
      if (!positions.has(outcome))
        positions.set(
          outcome,
          (
            await db.query(
              'SELECT COALESCE(max(position),0)::int AS n FROM "ContentChunk" WHERE "learningOutcomeId"=$1',
              [outcome],
            )
          ).rows[0].n,
        );
      const position = exists?.position ?? positions.get(outcome) + 1;
      positions.set(outcome, Math.max(position, positions.get(outcome)));
      const resourceUrl = chunk.resourceUrl;
      await saveRow(
        db,
        "ContentChunk",
        {
          ...chunk,
          learningOutcomeId: outcome,
          assessmentCriterionId: criterionIds.get(chunk.assessmentCriterionId),
          position,
          resourceUrl,
        },
        ["id"],
        ["resourceUrl"],
      );
    }
    for (const session of selectedSessions) {
      const stored = (
        await db.query('SELECT markdown FROM "StudySession" WHERE id=$1', [session.id])
      ).rows[0];
      if (stored?.markdown !== session.markdown)
        throw new Error("Readback mismatch: " + session.id);
    }
    await db.query("COMMIT");
    await writeFile(
      resolve(dir, "committed.json"),
      JSON.stringify(
        {
          ...report,
          committedAt: new Date().toISOString(),
          sourceHash: createHash("sha256").update(JSON.stringify(src)).digest("hex"),
        },
        null,
        2,
      ),
    );
    console.log("COMMITTED AND VERIFIED", selectedSessions.length, "sessions");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await Promise.all([source.end(), target.end()]);
}

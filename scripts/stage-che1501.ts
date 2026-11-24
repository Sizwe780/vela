import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { chemistryBatches } from "../content/che1501/batches";
import { chemistrySource } from "../content/che1501/source-map";
import { normalizeMath, mathSpans } from "../lib/content/math";
import { parseLearningBlocks } from "../lib/content/exercises";
import { visualPresetIds } from "../lib/content/visual-presets";
import { lessonDraftSchema } from "../lib/generation/draft";
import { embedTokens } from "../lib/ingest/embeddings";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { auditUnit, loadModuleSpec } from "../lib/specs";
import { BulkDatabase } from "./bulk-database";
import { reviseChemistryUnit } from "./che1501-revision";
import { auditReactionEquations } from "../lib/content/reaction-check";

const reportDir = ".vela/reports";
const moduleCode = "CHE1501";

function assertChemistryStaging(url: URL) {
  if (!/^ep-gentle-rice-bdzad4px(?:-pooler)?\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)) {
    throw new Error("CHE1501 staging requires the dedicated Neon staging compute endpoint.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--plan") {
    console.table(
      Object.entries(chemistrySource.units).map(([code, unit]) => ({
        code,
        topic: unit.topic,
        status:
          chemistryBatches.some((batch) => batch.unit.code === code)
              ? "Authored batch available"
              : "Original lessons needed",
        readings: unit.readings.length,
      })),
    );
    return;
  }
  const unitCode = args.find((arg) => arg.startsWith("--unit="))?.slice("--unit=".length);
  if (unitCode) {
    const sourceUnit = (chemistrySource.units as Record<string, { scope: string }>)[unitCode];
    if (sourceUnit?.scope === "excluded-syllabus") {
      throw new Error(`${unitCode} is excluded from the CHE1501 examinable syllabus and cannot be staged.`);
    }
  }
  const batch = chemistryBatches.filter(
    ({ unit }) => args.includes("--all") || unit.code === unitCode,
  );
  const apply = args.includes("--apply");
  const index = args.includes("--index");
  const revise = args.includes("--revise");
  if (
    !batch.length ||
    (unitCode && args.includes("--all")) ||
    (index && !apply) ||
    (revise && (!index || !unitCode)) ||
    args.some(
      (arg) => ![`--unit=${unitCode}`, "--all", "--apply", "--index", "--revise"].includes(arg),
    )
  ) {
    throw new Error(
      "Choose --all or --unit=CHE1501-U1. Use --apply to upload, --index for embeddings, and --revise with an indexed single unit to replace its staged revision.",
    );
  }
  const failures: string[] = [];
  for (const item of batch) {
    try {
      await stageBatch(item, { apply, index, revise });
    } catch (error) {
      failures.push(item.unit.code);
      console.error(item.unit.code, error instanceof Error ? error.message : "Staging failed.");
    }
  }
  if (failures.length) throw new Error(`Batches needing attention: ${failures.join(", ")}`);
}

async function stageBatch(
  batch: (typeof chemistryBatches)[number],
  { apply, index, revise }: { apply: boolean; index: boolean; revise: boolean },
) {
  const { unit, position, outcome, references } = batch;
  const sourceUnit = (chemistrySource.units as Record<string, { scope: string }>)[unit.code];
  if (sourceUnit.scope === "excluded-syllabus") {
    throw new Error("This unit is excluded from the CHE1501 examinable syllabus.");
  }
  if (sourceUnit.scope !== "working") {
    throw new Error("The source plan holds this unit for scope review.");
  }
  const spec = await loadModuleSpec({ institution: "UNISA", moduleCode });
  const sourceProse: unknown = JSON.parse(
    await readFile("../work/che1501-historical-guide-prose.json", "utf8"),
  );
  if (!Array.isArray(sourceProse) || sourceProse.some((page) => typeof page !== "string")) {
    throw new Error("Expected an array of historical guide pages for the originality audit.");
  }
  const draft = lessonDraftSchema.parse({ code: unit.code, sessions: unit.sessions });
  const report = auditUnit(spec, draft, {
    sourceProse,
    allowedVisuals: visualPresetIds,
    requireSourceAudit: true,
  });
  const reportPath = `${reportDir}/${unit.code}-preflight.json`;
  await mkdir(reportDir, { recursive: true });
  let reactionChecks: ReturnType<typeof auditReactionEquations> | undefined;
  if (report.passed && batch.reactionSkeletons) {
    try {
      reactionChecks = auditReactionEquations(
        draft.sessions.map((session) => session.markdown).join("\n\n"),
        batch.reactionSkeletons,
      );
      report.checks.push("reaction-atom-and-charge-conservation");
    } catch (error) {
      report.passed = false;
      report.issues.push({
        code: "REACTION_BALANCE",
        severity: "error",
        message: error instanceof Error ? error.message : "Reaction conservation audit failed",
      });
    }
  }
  if (!report.passed) {
    await writeFile(
      reportPath,
      JSON.stringify({ ...report, sourcePages: sourceProse.length }, null, 2) + "\n",
    );
    throw new Error(`Preflight failed for ${unit.code}: ${JSON.stringify(report.issues)}`);
  }
  const sessions = draft.sessions.map((session, index) => {
    const markdown = normalizeMath(session.markdown);
    return {
      title: session.title,
      position: index + 1,
      visual: session.visual,
      markdown,
      concepts: {
        topics: session.concepts,
        authorship: "vela-original",
        specHash: spec.hash,
        specVersion: spec.version,
        contentHash: createHash("sha256").update(markdown).digest("hex"),
        sourceReferences: references,
        scopeBasis: "Historical UNISA tutorial sequence; current OpenStax reading crosswalk",
        reviewStatus: "pending-subject-review",
      },
    };
  });
  const preflight = {
    ...report,
    sourcePages: sourceProse.length,
    sessions: sessions.length,
    formulas: sessions.reduce((total, session) => total + mathSpans(session.markdown).length, 0),
    exercises: sessions.reduce(
      (total, session) =>
        total +
        parseLearningBlocks(session.markdown).blocks.filter((block) => block.type === "exercise")
          .length,
      0,
    ),
    visuals: sessions.flatMap((session) => session.visual ?? []),
    reviewStatus: "pending-subject-review",
    ...(reactionChecks ? { reactionChecks } : {}),
  };
  await writeFile(reportPath, JSON.stringify(preflight, null, 2) + "\n");
  console.log(
    `${unit.code} preflight passed: ${preflight.sessions} sessions, ${preflight.exercises} exercises, ${preflight.formulas} math spans.`,
  );
  if (!apply) return;

  // Read the staging credential directly. The app's usual DATABASE_URL is never a write target.
  const url = new URL((await readFile("../work/neon-cli/che1501-staging-url.txt", "utf8")).trim());
  assertChemistryStaging(url);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  try {
    if (revise) {
      await reviseChemistryUnit(db, url.toString(), unit.code, position, outcome, sessions);
      return;
    }
    const { studyUnit, learningOutcomeId, assessmentCriterionId } = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${moduleCode}))::text`;
        const module = await tx.module.findUniqueOrThrow({
          where: { institution_code: { institution: "UNISA", code: moduleCode } },
        });
        const qualification = await tx.qualification.findFirstOrThrow({
          where: {
            institution: "UNISA",
            code: "90104",
            stream: "PSM",
            modules: { some: { moduleId: module.id } },
          },
        });
        const byCode = await tx.studyUnit.findUnique({
          where: { moduleId_code: { moduleId: module.id, code: unit.code } },
          include: { sessions: true },
        });
        const byPosition = await tx.studyUnit.findUnique({
          where: { moduleId_position: { moduleId: module.id, position } },
        });
        if (
          (byPosition && byPosition.code !== unit.code) ||
          (byCode && byCode.position !== position)
        ) {
          throw new Error(`Conflicting unit code or position for ${unit.code}`);
        }
        for (const existing of byCode?.sessions ?? []) {
          const candidate = sessions.find((session) => session.position === existing.position);
          if (
            !candidate ||
            candidate.title !== existing.title ||
            candidate.visual !== existing.visual ||
            candidate.markdown !== existing.markdown
          ) {
            throw new Error(
              `Existing session changed at position ${existing.position}; stage revision explicitly.`,
            );
          }
        }
        const study =
          byCode ??
          (await tx.studyUnit.create({
            data: {
              moduleId: module.id,
              code: unit.code,
              title: unit.title ?? batch.unit.title ?? batch.unit.code,
              position,
            },
          }));
        const criterionCode = `LOCAL-${unit.code}`;
        const criterion = await tx.assessmentCriterion.upsert({
          where: {
            qualificationId_code: { qualificationId: qualification.id, code: criterionCode },
          },
          create: {
            qualificationId: qualification.id,
            code: criterionCode,
            description: outcome,
            authority: "CURRICULUM",
            sourceUrl: references[0],
          },
          update: {},
        });
        if (criterion.authority !== "CURRICULUM") {
          throw new Error(`Unexpected authority for ${criterionCode}`);
        }
        const learningOutcome = await tx.learningOutcome.upsert({
          where: { studyUnitId_code: { studyUnitId: study.id, code: "LO1" } },
          create: {
            studyUnitId: study.id,
            code: "LO1",
            position: 1,
            description: outcome,
            assessmentCriteria: { connect: { id: criterion.id } },
          },
          update: {
            assessmentCriteria: { connect: { id: criterion.id } },
          },
        });
        for (const session of sessions) {
          const existing = byCode?.sessions.find((row) => row.position === session.position);
          if (existing) continue;
          await tx.studySession.create({
            data: { id: `${unit.code}-S${session.position}`, studyUnitId: study.id, ...session },
          });
        }
        return {
          studyUnit: study,
          learningOutcomeId: learningOutcome.id,
          assessmentCriterionId: criterion.id,
        };
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
    const stored = await db.studySession.findMany({
      where: { studyUnitId: studyUnit.id },
      orderBy: { position: "asc" },
    });
    if (
      stored.length !== sessions.length ||
      stored.some(
        (session, index) =>
          session.markdown !== sessions[index].markdown ||
          session.visual !== sessions[index].visual,
      )
    ) {
      throw new Error("Staging read-back did not match the audited sessions.");
    }
    console.log(
      `Verified ${stored.length} stored sessions on che1501-staging at /study/${unit.code}`,
    );
    if (index) {
      process.env.AI_PROVIDER = "cloudflare";
      const sql = new BulkDatabase(url.toString());
      try {
        const repository = createIngestionRepository(sql);
        for (const session of stored) {
          const sourceName = `Vela original / ${unit.code} / S${session.position}: ${session.title}`;
          const receipt = await ingest(
            {
              moduleCode,
              studyUnitId: studyUnit.id,
              learningOutcomeId,
              assessmentCriterionId,
              sourceName,
              text: session.markdown,
            },
            repository,
            embedTokens,
          );
          await sql.repairLinks(receipt.ingestionId, `/study/${unit.code}/sessions/${session.id}`);
          console.log(
            `Cloudflare S${session.position}: ${receipt.chunkCount} chunks${receipt.reused ? " reused" : ""}`,
          );
        }
      } finally {
        await sql.disconnect();
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "CHE1501 staging failed.");
  process.exitCode = 1;
});

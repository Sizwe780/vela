import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { bpt1501Batches, bpt1501Source } from "../content/bpt1501/batches";
import { normalizeMath } from "../lib/content/math";
import { publishedStudyUnit } from "../lib/study/published-units";
import { parseWidgetBlocks } from "../lib/content/widget-registry";
import { parseLearningBlocks } from "../lib/content/exercises";
import { lessonDraftSchema } from "../lib/generation/draft";
import { auditUnit, loadModuleSpec } from "../lib/specs";
import { embedTokens } from "../lib/ingest/embeddings";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { BulkDatabase } from "./bulk-database";

const moduleCode = "BPT1501";
const reportDir = ".vela/reports";
const reportPath = `${reportDir}/BPT1501-ingestion.json`;
const sourceUrl =
  "https://www.unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Subjects-%26-modules/All-modules/Being-a-Professional-Teacher-%E2%80%93-BPT1501";

async function blockerReport(status: "draft-audited" | "ingested") {
  const blockers = [
    {
      code: "OFFICIAL_2026_SOURCE_MISSING",
      status: "open",
      severity: "release",
      message:
        "Attach the current UNISA BPT1501 Tutorial Letter or official course guide and verify it before public syllabus promotion.",
    },
    {
      code: "OFFICIAL_PAGE_PROVENANCE_MISSING",
      status: "open",
      severity: "release",
      message:
        "Record source filename, SHA-256, physical pages and mapped learning-unit evidence for the accepted 2026 lesson scope.",
    },
    {
      code: "ASSIGNMENT_PROMPTS_RUBRICS_MISSING",
      status: "open",
      severity: "release",
      message:
        "Attach the official prompts, rubrics and submission instructions for Assignments 01–07.",
    },
    {
      code: "SUBJECT_REVIEW_PENDING",
      status: "open",
      severity: "release",
      message:
        "A qualified South African teacher education reviewer must approve the lessons and professional-policy interpretation.",
    },
  ];
  await mkdir(reportDir, { recursive: true });
  const report = {
    moduleCode,
    status,
    scope: bpt1501Source.sourceScope,
    units: bpt1501Batches.map((batch) => ({
      code: batch.unit.code,
      title: batch.unit.title,
      position: batch.position,
      sessions: batch.unit.sessions.length,
    })),
    blockers,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const index = args.includes("--index");
  const plan = args.includes("--plan");
  if (args.some((arg) => !["--plan", "--apply", "--index"].includes(arg)) || (index && !apply))
    throw new Error("Use --plan, or --apply with optional --index.");

  const spec = await loadModuleSpec({ institution: "UNISA", moduleCode });
  const failures: string[] = [];
  for (const batch of bpt1501Batches) {
    const draft = lessonDraftSchema.parse({
      code: batch.unit.code,
      sessions: batch.unit.sessions.map((session) => ({
        ...session,
        visual: session.visual ?? null,
      })),
    });
    const report = auditUnit(spec, draft, { requireSourceAudit: false });
    for (const session of draft.sessions) {
      const visuals = parseLearningBlocks(session.markdown)
        .blocks.filter((block) => block.type === "text")
        .map((block) => parseWidgetBlocks(block.text));
      if (
        visuals.some(({ errors }) => errors.length) ||
        !visuals.some(({ blocks }) =>
          blocks.some(
            (block) => block.type === "widget" && block.widget.type === "teaching_framework",
          ),
        )
      ) {
        failures.push(batch.unit.code);
        console.error("Missing or invalid inline teaching visual: " + session.title);
      }
    }
    if (!report.passed) {
      failures.push(batch.unit.code);
      console.error(JSON.stringify(report));
    } else {
      console.log(
        `${batch.unit.code}: ${draft.sessions.length} session(s), ` +
          `${draft.sessions.reduce((n, session) => n + parseLearningBlocks(session.markdown).blocks.filter((block) => block.type === "exercise").length, 0)} exercise(s)`,
      );
    }
  }
  if (failures.length) throw new Error(`BPT1501 preflight failed: ${failures.join(", ")}`);

  if (!apply) {
    const report = await blockerReport("draft-audited");
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for BPT1501 ingestion.");

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  try {
    await db.$transaction(
      async (tx) => {
        const qualification = await tx.qualification.findFirstOrThrow({
          where: { institution: "UNISA", code: "90104", stream: "PSM" },
        });
        const module = await tx.module.findUniqueOrThrow({
          where: { institution_code: { institution: "UNISA", code: moduleCode } },
        });
        await tx.qualificationModule.findUniqueOrThrow({
          where: {
            qualificationId_moduleId: { qualificationId: qualification.id, moduleId: module.id },
          },
        });

        for (const batch of bpt1501Batches) {
          const draft = lessonDraftSchema.parse({
            code: batch.unit.code,
            sessions: batch.unit.sessions.map((session) => ({
              ...session,
              visual: session.visual ?? null,
            })),
          });
          const studyUnit = await tx.studyUnit.upsert({
            where: { moduleId_code: { moduleId: module.id, code: batch.unit.code } },
            create: {
              moduleId: module.id,
              code: batch.unit.code,
              title: batch.unit.title ?? batch.unit.code,
              position: batch.position,
            },
            update: {
              title: batch.unit.title ?? batch.unit.code,
              position: batch.position,
            },
          });
          const criterion = await tx.assessmentCriterion.upsert({
            where: {
              qualificationId_code: {
                qualificationId: qualification.id,
                code: `LOCAL-${batch.unit.code}`,
              },
            },
            create: {
              qualificationId: qualification.id,
              code: `LOCAL-${batch.unit.code}`,
              description: batch.outcome,
              sourceUrl,
              authority: "CURRICULUM",
            },
            update: {
              description: batch.outcome,
              sourceUrl,
              authority: "CURRICULUM",
            },
          });
          const learningOutcome = await tx.learningOutcome.upsert({
            where: { studyUnitId_code: { studyUnitId: studyUnit.id, code: "LO1" } },
            create: {
              studyUnitId: studyUnit.id,
              code: "LO1",
              position: 1,
              description: batch.outcome,
              assessmentCriteria: { connect: { id: criterion.id } },
            },
            update: {
              description: batch.outcome,
              assessmentCriteria: { connect: { id: criterion.id } },
            },
          });

          for (const [sessionIndex, session] of draft.sessions.entries()) {
            const markdown = normalizeMath(session.markdown);
            const id = `${batch.unit.code}-S${sessionIndex + 1}`;
            const concepts = {
              topics: session.concepts,
              authorship: "vela-original",
              specHash: spec.hash,
              specVersion: spec.version,
              contentHash: createHash("sha256").update(markdown).digest("hex"),
              sourceReferences: [sourceUrl],
              scopeBasis: "Vela teaching sequence; official UNISA assessment verification pending",
              reviewStatus: "pending-subject-review",
            };
            const existing = await tx.studySession.findUnique({ where: { id } });
            if (existing) {
              const storedSpecHash =
                existing.concepts &&
                typeof existing.concepts === "object" &&
                !Array.isArray(existing.concepts)
                  ? existing.concepts.specHash
                  : undefined;
              if (
                existing.markdown !== markdown ||
                existing.visual !== (session.visual ?? null) ||
                existing.title !== session.title ||
                storedSpecHash !== spec.hash
              ) {
                await tx.studySession.update({
                  where: { id },
                  data: {
                    title: session.title,
                    position: sessionIndex + 1,
                    visual: session.visual ?? null,
                    markdown,
                    concepts,
                    version: { increment: 1 },
                  },
                });
              }
            } else {
              await tx.studySession.create({
                data: {
                  id,
                  studyUnitId: studyUnit.id,
                  position: sessionIndex + 1,
                  title: session.title,
                  visual: session.visual ?? null,
                  markdown,
                  concepts,
                },
              });
            }
          }
        }
      },
      { maxWait: 15_000, timeout: 90_000 },
    );

    if (index) {
      process.env.AI_PROVIDER = "cloudflare";
      const sql = new BulkDatabase(url.toString());
      try {
        const repository = createIngestionRepository(sql);
        for (const batch of bpt1501Batches) {
          const unit = await db.studyUnit.findFirstOrThrow({
            where: {
              code: batch.unit.code,
              module: { institution: "UNISA", code: moduleCode },
            },
            include: {
              learningOutcomes: {
                include: { assessmentCriteria: { where: { code: `LOCAL-${batch.unit.code}` } } },
              },
              sessions: { orderBy: { position: "asc" } },
            },
          });
          const outcome = unit.learningOutcomes[0];
          const criterion = outcome.assessmentCriteria[0];
          if (!outcome || !criterion)
            throw new Error(`Missing curriculum mapping for ${batch.unit.code}`);
          for (const session of unit.sessions) {
            const sourceName = `Vela original / ${batch.unit.code} / S${session.position}: ${session.title}`;
            const receipt = await ingest(
              {
                moduleCode,
                studyUnitId: unit.id,
                learningOutcomeId: outcome.id,
                assessmentCriterionId: criterion.id,
                sourceName,
                text: session.markdown,
              },
              repository,
              embedTokens,
            );
            await sql.repairLinks(
              receipt.ingestionId,
              `/study/${batch.unit.code}/sessions/${session.id}`,
            );
            console.log(
              `${batch.unit.code} S${session.position}: ${receipt.chunkCount} chunks${receipt.reused ? " reused" : ""}`,
            );
          }
        }
      } finally {
        await sql.disconnect();
      }
    }

    const stored = await db.studyUnit.findMany({
      where: { ...publishedStudyUnit, module: { institution: "UNISA", code: moduleCode } },
      include: { sessions: true },
      orderBy: { position: "asc" },
    });
    const report = await blockerReport("ingested");
    console.log(
      JSON.stringify(
        {
          ingestedUnits: stored.filter((unit) =>
            bpt1501Batches.some((batch) => batch.unit.code === unit.code),
          ).length,
          ingestedSessions: stored.reduce(
            (count, unit) =>
              count +
              (bpt1501Batches.some((batch) => batch.unit.code === unit.code)
                ? unit.sessions.length
                : 0),
            0,
          ),
          indexed: index,
          reportPath,
          openBlockers: report.blockers.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "BPT1501 ingestion failed.");
  process.exitCode = 1;
});

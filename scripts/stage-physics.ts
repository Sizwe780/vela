import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import "dotenv/config";
import { physicsPilot, physicsNext, physicsFurther, physicsFinal, physicsDepth, physicsEnrichment, physicsApplications, physicsConsolidation, physicsCompletion } from "../content/physics/pilot";
import { BulkDatabase } from "./bulk-database";
import { teachingPracticeUnits } from "../content/tps2601/lessons";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { embedTokens } from "../lib/ingest/embeddings";
import { moduleCapabilities } from "../lib/capabilities";
import { normalizeMath } from "../lib/content/math";
import { parseWidgetBlocks, widgetCapability } from "../lib/content/widget-registry";
import { auditUnit, loadModuleSpec } from "../lib/specs";

const pilotOutcomes: Record<string, string> = {
  "PHY1505-U1": "Interpret signed displacement, velocity and acceleration in graphs and equations.",
  "PHY1503-U1": "Read fine scales and correct signed instrument zero offsets.",
  "PHY1503-U2": "Interpret a regression and report the result with uncertainties and limitations.",
  "PHY1503-U3": "Analyse simulated pendulum, circular motion and air-track readings.",
  "PHY1503-U4": "Use a circuit model and fitted measurements to distinguish cell emf and internal resistance.",
  "PHY1503-U5": "Use angular readings to analyse diffraction and relate magnetic force to current and geometry.",
  "PHY1503-U6": "Interpret electron diffraction rings, the photoelectric threshold and electron-beam curvature.",
  "PHY1505-U2": "Resolve motion into components and predict ideal projectile trajectories.",
  "PHY1505-U3": "Use free-body diagrams and friction limits to predict motion on an incline.",
  "PHY1505-U4": "Apply the work–energy and impulse–momentum relationships using an explicit system boundary.",
  "PHY1505-U5": "Identify the inward resultant force in circular motion and derive the circular-orbit speed.",
  "PHY1505-U6": "Derive the axial moment of inertia and connect torque, inertia and angular acceleration.",
  "PHY1505-U7": "Relate restoring laws to oscillations and apply ideal-fluid and linear-elastic models.",
};

async function main() {
  const args = process.argv.slice(2);
  const index = args.includes("--index");
  const teachingPractice = args.includes("--teaching-practice");
  const importId = teachingPractice ? "tps2601-pilot" : "physics-pilot";
  if (args.some((flag) => !["--apply", "--expanded", "--index", "--teaching-practice"].includes(flag)) ||
      (teachingPractice && args.includes("--expanded")) ||
      (index && !(args.includes("--apply") && (teachingPractice || args.includes("--expanded")))) ||
      new Set(args).size !== args.length) {
    throw new Error("Use --apply for dedicated staging and --expanded to include the next batch.");
  }
  const selected = new Map<string, { code: string; title: string; sessions: (typeof physicsPilot)[number]["sessions"] }>();
  const batches = teachingPractice ? teachingPracticeUnits : args.includes("--expanded")
    ? [...physicsPilot, ...physicsNext, ...physicsFurther, ...physicsFinal, ...physicsDepth, ...physicsEnrichment, ...physicsApplications, ...physicsConsolidation, ...physicsCompletion]
    : physicsPilot;
  for (const unit of batches) {
    const previous = selected.get(unit.code);
    selected.set(unit.code, previous
      ? { ...previous, sessions: [...previous.sessions, ...unit.sessions] }
      : unit);
  }
  const units = await Promise.all([...selected.values()].map(async (unit) => {
    const moduleCode = unit.code.split("-")[0];
    const spec = await loadModuleSpec({ institution: "UNISA", moduleCode });
    const report = auditUnit(spec, unit);
    if (!report.passed) throw new Error(JSON.stringify(report.issues));
    const capabilities = moduleCapabilities("UNISA", moduleCode);
    const sessions = unit.sessions.map((session, index) => {
      const markdown = normalizeMath(session.markdown);
      const { blocks, errors } = parseWidgetBlocks(markdown);
      if (errors.length || (!teachingPractice && !blocks.some((block) => block.type === "widget")) || blocks.some(
        (block) => block.type === "widget" && !capabilities[widgetCapability(block.widget)],
      )) throw new Error("Invalid or unsupported visual in " + session.title);
      return {
        id: unit.code + "-S" + (index + 1),
        title: session.title,
        position: index + 1,
        markdown,
        visual: session.visual ?? null,
        concepts: {
          topics: [...(session.concepts ?? [])],
          authorship: "vela-original",
          reviewStatus: "staging-preview-pending-subject-review",
          stagingImport: importId,
          lessonVoice: "direct-teaching",
          specHash: spec.hash,
          contentHash: createHash("sha256").update(markdown).digest("hex"),
        },
      };
    });
    console.log(unit.code, sessions.length, "sessions passed preflight");
    return { unit, sessions, moduleCode };
  }));
  if (!args.includes("--apply")) return;

  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech") {
    throw new Error("Preview requires the dedicated Neon staging endpoint.");
  }
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  try {
    const evidence = await db.$transaction(async (tx) => {
      const targets = [];
      const qualification = await tx.qualification.findFirstOrThrow({
        where: { institution: "UNISA", code: "90104", stream: "PSM" },
      });
      for (const { unit, sessions, moduleCode } of units) {
        const module = await tx.module.findUniqueOrThrow({
          where: { institution_code: { institution: "UNISA", code: moduleCode } },
        });
        await tx.qualificationModule.findUniqueOrThrow({
          where: { qualificationId_moduleId: { qualificationId: qualification.id, moduleId: module.id } },
        });
        const position = Number(unit.code.split("-U")[1]);
        const stored = await tx.studyUnit.upsert({
          where: { moduleId_code: { moduleId: module.id, code: unit.code } },
          create: { moduleId: module.id, code: unit.code, position, title: unit.title },
          update: {},
        });
        const code = "LOCAL-" + unit.code;
        const description = teachingPracticeUnits.find((item) => item.code === unit.code)?.outcome ?? pilotOutcomes[unit.code];
        const criterion = await tx.assessmentCriterion.upsert({
          where: { qualificationId_code: { qualificationId: qualification.id, code } },
          create: {
            qualificationId: qualification.id, code, description,
            authority: "CURRICULUM", sourceUrl: "/study/" + unit.code + "/sessions",
          },
          update: {},
        });
        const outcome = await tx.learningOutcome.upsert({
          where: { studyUnitId_code: { studyUnitId: stored.id, code: "LO1" } },
          create: { studyUnitId: stored.id, code: "LO1", position: 1, description, assessmentCriteria: { connect: { id: criterion.id } } },
          update: { assessmentCriteria: { connect: { id: criterion.id } } },
        });
        targets.push({ moduleCode, unit, stored, outcome, criterion, sessions });
        for (const session of sessions) {
          const current = await tx.studySession.findUnique({ where: { id: session.id } });
          if (!current) {
            await tx.studySession.create({ data: { ...session, studyUnitId: stored.id } });
            continue;
          }
          const metadata = current.concepts;
          if (current.studyUnitId !== stored.id || !metadata || typeof metadata !== "object" ||
              Array.isArray(metadata) || metadata.stagingImport !== importId) {
            throw new Error("Existing session is outside this staging import: " + session.id);
          }
          if (metadata.contentHash !== createHash("sha256").update(current.markdown).digest("hex")) {
            throw new Error("Existing session has editorial changes: " + session.id);
          }
          if (current.markdown !== session.markdown || current.title !== session.title ||
              current.position !== session.position || current.visual !== session.visual ||
              metadata.specHash !== session.concepts.specHash || metadata.lessonVoice !== "direct-teaching") {
            const { id, ...data } = session;
            const result = await tx.studySession.updateMany({
              where: { id, version: current.version },
              data: { ...data, version: { increment: 1 } },
            });
            if (result.count !== 1) throw new Error("Concurrent session edit: " + id);
          }
        }
        const published = await tx.studySession.count({ where: { studyUnitId: stored.id, id: { in: sessions.map(({ id }) => id) } } });
        if (published !== sessions.length) throw new Error("Staging read-back failed for " + unit.code);
      }
      return targets;
    }, { maxWait: 15_000, timeout: 180_000, isolationLevel: "Serializable" });
    console.log("Dedicated staging verified:", units.length, "units,", units.reduce((sum, unit) => sum + unit.sessions.length, 0), "sessions");
    if (index) {
      process.env.AI_PROVIDER = "cloudflare";
      const sql = new BulkDatabase(url.toString());
      const repository = createIngestionRepository(sql);
      try {
        for (const { moduleCode, unit, stored, outcome, criterion, sessions } of evidence) {
          for (const session of sessions) {
            const receipt = await ingest({
              moduleCode, studyUnitId: stored.id, learningOutcomeId: outcome.id,
              assessmentCriterionId: criterion.id,
              sourceName: `Vela original / ${session.id}: ${session.title}`,
              text: session.markdown,
            }, repository, embedTokens);
            await sql.repairLinks(receipt.ingestionId, `/study/${unit.code}/sessions/${session.id}`);
            console.log(session.id, receipt.chunkCount, "chunks", receipt.reused ? "reused" : "indexed");
          }
        }
      } finally {
        await sql.disconnect();
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Physics staging failed.");
  process.exitCode = 1;
});

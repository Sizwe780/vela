import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/app-client";
import { bpt1501Batches } from "../content/bpt1501/batches";
import { chemistryBatches } from "../content/che1501/batches";
import { curriculum as linearAlgebra } from "../content/mat1503/sessions";
import { curriculum as calculus } from "../content/mat1512/sessions";
import { auditUnit, loadModuleSpec, type SpecUnit } from "../lib/specs";
import { parseLearningBlocks } from "../lib/content/exercises";
import { parseWidgetBlocks } from "../lib/content/widget-registry";
import { normalizeMath } from "../lib/content/math";
import { visualPresetIds } from "../lib/content/visual-presets";
import { prepareIngestion, finishPreparedIngestion } from "../lib/ingest/service";
import { createIngestionRepository, type Database } from "../lib/ingest/repository";
import { embedTokens } from "../lib/ingest/embeddings";
import { transactionLock } from "../lib/teaching/scope";
import { BulkDatabase } from "./bulk-database";
import { inlineSessionVisual } from "../lib/content/inline-visual";

const modules: Record<string, readonly SpecUnit[]> = {
  BPT1501: bpt1501Batches.map(({ unit }) => unit),
  CHE1501: chemistryBatches.map(({ unit }) => unit),
  MAT1503: linearAlgebra,
  MAT1512: calculus,
};
const stagingEndpoint = "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  if (args.some((arg) => arg !== "--apply")) throw Error("Use --apply to update the verified staging branch.");
  const specs = new Map<string, Awaited<ReturnType<typeof loadModuleSpec>>>();
  for (const [moduleCode, units] of Object.entries(modules)) {
    const spec = await loadModuleSpec({ moduleCode, institution: "UNISA" });
    specs.set(moduleCode, spec);
    for (const unit of units) {
      const audit = auditUnit(spec, unit, { allowedVisuals: visualPresetIds });
      if (!audit.passed) throw Error(unit.code + " " + JSON.stringify(audit.issues.filter((issue) => issue.severity === "error")));
      for (const session of unit.sessions)
        for (const part of parseLearningBlocks(session.markdown).blocks)
          if (part.type === "text" && parseWidgetBlocks(part.text).errors.length)
            throw Error("Invalid widget directive in " + session.title);
    }
    console.log(moduleCode, "audited", units.reduce((sum, unit) => sum + unit.sessions.length, 0));
  }
  if (!apply) return;

  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== stagingEndpoint) throw Error("This revision command is restricted to the dedicated staging database.");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  process.env.AI_PROVIDER = "cloudflare";
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }) });
  const sql = new BulkDatabase(url.toString());
  try {
    const repository = createIngestionRepository(sql);
    for (const [moduleCode, units] of Object.entries(modules)) {
      const spec = specs.get(moduleCode)!;
      for (const plan of units) {
        const unit = await db.studyUnit.findFirstOrThrow({
          where: { code: plan.code, module: { code: moduleCode, institution: "UNISA" } },
          include: { sessions: { orderBy: { position: "asc" } }, learningOutcomes: { where: { code: "LO1" },
            include: { assessmentCriteria: { where: { qualification: { institution: "UNISA", code: "90104", stream: "PSM" } } } },
          } },
        });
        if (unit.sessions.length !== plan.sessions.length || plan.sessions.some((row, index) => row.title !== unit.sessions[index].title))
          throw Error("Confirm the published session mapping for " + plan.code);
        const updates = plan.sessions.flatMap((entry, index) => {
          const previous = unit.sessions[index];
          const markdown = normalizeMath(inlineSessionVisual(entry.markdown, entry.visual));
          const visual = null;
          return markdown === previous.markdown && visual === previous.visual ? [] : [{ previous, markdown, visual }];
        });
        if (!updates.length) continue;
        const outcome = unit.learningOutcomes[0];
        const criterion = outcome?.assessmentCriteria[0];
        if (!criterion || outcome.assessmentCriteria.length !== 1) throw Error("Confirm one curated criterion for " + plan.code);
        const prepared: ((typeof updates)[number] & {
          preparedIndex: Awaited<ReturnType<typeof prepareIngestion>>;
        })[] = [];
        for (const update of updates) {
          const preparedIndex = await prepareIngestion({
            moduleCode, studyUnitId: unit.id, learningOutcomeId: outcome.id, assessmentCriterionId: criterion.id,
            sourceName: `Vela original / ${plan.code} / S${update.previous.position}: ${update.previous.title}`,
            text: update.markdown,
          }, repository, embedTokens);
          prepared.push({ ...update, preparedIndex });
        }
        const chunks = await db.$transaction(async (tx) => {
          await transactionLock(tx, "vela:unit:" + unit.id);
          const atomic: Database = { query: statement => tx.$queryRaw(statement), transaction: callback => callback(atomic) };
          const writer = createIngestionRepository(atomic);
          let count = 0;
          for (const { previous, markdown, visual, preparedIndex } of prepared) {
            const result = await tx.studySession.updateMany({
              where: { id: previous.id, version: previous.version, markdown: previous.markdown },
              data: {
                markdown, visual, version: { increment: 1 },
                concepts: {
                  ...(previous.concepts && typeof previous.concepts === "object" && !Array.isArray(previous.concepts) ? previous.concepts : { topics: previous.concepts }),
                  lessonVoice: "direct-teaching", specHash: spec.hash, specVersion: spec.version,
                  contentHash: createHash("sha256").update(markdown).digest("hex"),
                } as Prisma.InputJsonObject,
              },
            });
            if (result.count !== 1) throw Error("A session changed during preparation. Retry from the current version.");
            const receipt = await finishPreparedIngestion(preparedIndex, writer);
            count += receipt.chunkCount;
            await tx.contentChunk.updateMany({
              where: { ingestionId: receipt.ingestionId },
              data: { resourceUrl: "/study/" + plan.code + "/sessions/" + previous.id },
            });
          }
          return count;
        }, { maxWait: 12000, timeout: 90000 });
        console.log(plan.code, "updated", prepared.length, "sessions and", chunks, "chunks");
      }
    }
  } finally {
    await sql.disconnect();
    await db.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Lesson revision failed.");
  process.exitCode = 1;
});

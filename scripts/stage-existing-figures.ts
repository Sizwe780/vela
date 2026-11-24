import "dotenv/config";
import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { quantumPeriodicity } from "../content/che1501/quantum-periodicity";
import { reactionClasses } from "../content/che1501/reaction-classes";
import { stoichiometry } from "../content/che1501/stoichiometry";
import { determinantUnits } from "../content/mat1503/determinants";
import { vectorUnits } from "../content/mat1503/vectors-complex";
import { curriculum } from "../content/mat1512/sessions";
import { lessonFigure } from "../lib/content/lesson-figures";
import { embedTokens } from "../lib/ingest/embeddings";
import { createIngestionRepository } from "../lib/ingest/repository";
import { ingest } from "../lib/ingest/service";
import { BulkDatabase } from "./bulk-database";

const units = [quantumPeriodicity, reactionClasses, stoichiometry, ...determinantUnits, ...vectorUnits, ...curriculum];

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply")) throw new Error("Use --apply to stage missing original figures.");
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.hostname !== "ep-gentle-rice-bdzad4px.c-8.us-east-2.aws.neon.tech") throw new Error("Dedicated staging only.");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }) });
  const sql = new BulkDatabase(url.toString());
  const repository = createIngestionRepository(sql);
  process.env.AI_PROVIDER = "cloudflare";
  try {
    for (const unit of units) for (const session of unit.sessions) {
      const figures = [...session.markdown.matchAll(/^!\[[^\]\n]+\]\((\/lesson-figures\/[a-z0-9-]+\.svg)\)$/gm)];
      if (!figures.length) continue;
      const moduleCode = unit.code.split("-")[0];
      const matching = await db.studySession.findMany({
        where: { title: session.title, studyUnit: { code: unit.code, module: { institution: "UNISA", code: moduleCode } } },
        include: { studyUnit: { include: { learningOutcomes: { orderBy: { position: "asc" }, include: { assessmentCriteria: true } } } } },
      });
      if (matching.length !== 1) throw new Error("Expected one staged session for " + unit.code + " / " + session.title);
      const current = matching[0];
      const missing = figures.filter(([, src]) => !current.markdown.includes(src));
      if (!missing.length) continue;
      for (const [, src] of missing) {
        if (lessonFigure(src)?.credit.split(" based on")[0].split(" ·")[0] !== "Original Vela schematic")
          throw new Error("Expected an original registered schematic: " + src);
        await access("public" + src);
      }
      const visualHeading = /^## Visual exploration[^\r\n]*$/m;
      if (!visualHeading.test(current.markdown)) throw new Error("Missing visual section: " + current.id);
      const markdown = current.markdown.replace(visualHeading, (heading) =>
        heading + "\n\n" + missing.map(([directive]) => directive).join("\n\n") + "\n",
      );
      console.log(current.id, missing.map(([, src]) => src).join(", "));
      if (!args.length) continue;
      const outcome = current.studyUnit.learningOutcomes.find((item) => item.assessmentCriteria.length > 0);
      const criterion = outcome?.assessmentCriteria[0];
      if (!outcome || !criterion) throw new Error("Missing criterion for " + current.id);
      const receipt = await ingest({
        moduleCode, studyUnitId: current.studyUnitId, learningOutcomeId: outcome.id,
        assessmentCriterionId: criterion.id, sourceName: `Vela original / ${current.id}: ${current.title}`,
        text: markdown,
      }, repository, embedTokens);
      await sql.repairLinks(receipt.ingestionId, `/study/${unit.code}/sessions/${current.id}`);
      const old = current.concepts;
      const concepts = old && typeof old === "object" && !Array.isArray(old) ? old : {};
      const result = await db.studySession.updateMany({
        where: { id: current.id, version: current.version, markdown: current.markdown },
        data: { markdown, version: { increment: 1 }, concepts: { ...concepts, contentHash: createHash("sha256").update(markdown).digest("hex") } },
      });
      if (result.count !== 1) throw new Error("Session changed while staging: " + current.id);
    }
  } finally {
    await Promise.all([db.$disconnect(), sql.disconnect()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Staging figure update failed.");
  process.exitCode = 1;
});

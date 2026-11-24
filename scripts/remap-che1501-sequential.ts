import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";

async function main() {
  const stagingUrl = (await readFile("../work/neon-cli/che1501-staging-url.txt", "utf8")).trim();
  const url = new URL(stagingUrl);
  if (!/^ep-gentle-rice-bdzad4px(?:-pooler)?\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)) {
    throw new Error("CHE1501 renumbering requires the dedicated staging endpoint.");
  }
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
  });
  await db.$transaction(
    async (tx) => {
    const module = await tx.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "CHE1501" } },
    });

    const equilibrium = await tx.studyUnit.findFirst({
      where: { moduleId: module.id, code: "CHE1501-U8", position: 8 },
    });
    if (equilibrium) {
      await tx.studyUnit.update({
        where: { id: equilibrium.id },
        data: { code: "CHE1501-U7", position: 7, title: "Chemical equilibrium" },
      });
      const criterion = await tx.assessmentCriterion.findFirst({
        where: { code: "LOCAL-CHE1501-U8", qualification: { modules: { some: { moduleId: module.id } } } },
      });
      if (criterion) {
        await tx.assessmentCriterion.update({
          where: { id: criterion.id },
          data: { code: "LOCAL-CHE1501-U7", description: "Chemical equilibrium and reaction quotient." },
        });
      }
    }

    const gases = await tx.studyUnit.findFirst({
      where: { moduleId: module.id, code: "CHE1501-U11", position: 11 },
    });
    if (gases) {
      await tx.studyUnit.update({
        where: { id: gases.id },
        data: { code: "CHE1501-U8", position: 8, title: "Gases" },
      });
      const criterion = await tx.assessmentCriterion.findFirst({
        where: { code: "LOCAL-CHE1501-U11", qualification: { modules: { some: { moduleId: module.id } } } },
      });
      if (criterion) {
        await tx.assessmentCriterion.update({
          where: { id: criterion.id },
          data: { code: "LOCAL-CHE1501-U8", description: "Ideal-gas relationships and model assumptions." },
        });
      }
    }
    },
    { maxWait: 15000, timeout: 60000 },
  );
  await db.$disconnect();
  console.log("CHE1501 staging units remapped: U8 -> U7 equilibrium, U11 -> U8 gases.");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "CHE1501 remapping failed.");
  process.exitCode = 1;
});

import "dotenv/config";
import { PrismaClient } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mat1503Skills } from "../content/mat1503/skills";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
});
async function main() {
  try {
    const result = await db.$transaction(
      async (tx) => {
        let outcomes = 0;
        for (const [code, skills] of Object.entries(mat1503Skills)) {
          const changed = await tx.learningOutcome.updateMany({
            where: {
              studyUnit: { code, module: { institution: "UNISA", code: "MAT1503" } },
              description: { startsWith: "Understand, execute, explain and check " },
            },
            data: { description: skills.join(" ") },
          });
          outcomes += changed.count;
        }
        const titles = await tx.studySession.updateMany({
          where: {
            studyUnit: { module: { institution: "UNISA", code: "MAT1503" } },
            title: "Zero determinant, dependence and possible data",
          },
          data: { title: "Zero determinant, dependence and consistent systems" },
        });
        return { outcomeDescriptionsUpdated: outcomes, sessionTitlesUpdated: titles.count };
      },
      { maxWait: 5000, timeout: 15000 },
    );
    console.log(JSON.stringify(result));
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Content metadata repair failed");
  process.exitCode = 1;
});

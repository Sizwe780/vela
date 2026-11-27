import { mat1503Skills } from "../content/mat1503/skills";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient, Prisma } from "../generated/app-client";
import { PrismaPg } from "@prisma/adapter-pg";
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
});
async function main() {
  try {
    const plan = JSON.parse(await readFile("content/mat1503/plan.json", "utf8"));
    const module = await db.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: "MAT1503" } },
    });
    const qualification = await db.qualification.findFirstOrThrow({
      where: { institution: "UNISA", code: "90104", stream: "PSM" },
    });
    const metadata = {
      ...((module.metadata as Record<string, unknown>) ?? {}),
      sourceNote: plan.sourceNote,
      sourceFiles: plan.sources.map((s: any) => ({
        id: s.id,
        title: s.title,
        sha256: s.sha256,
        url: `/api/sources/${s.id}?sha=${s.sha256}`,
      })),
      sourceYears: [2018, 2023],
      policyStatus:
        "Historical source administration only; current delivery, marks, dates and pass policies have not been verified.",
      scope:
        "13 supplied tutorial-resource study units; not every chapter of the802-page textbook.",
      authoredStatus: (module.metadata as any)?.authoredStatus ?? "in-preparation",
      unitCount: 13,
    };
    await db.$transaction(
      async (tx) => {
        await tx.module.update({
          where: { id: module.id },
          data: { metadata: metadata as Prisma.InputJsonValue },
        });
        for (const unit of plan.units) {
          const conflict = await tx.studyUnit.findUnique({
            where: { moduleId_position: { moduleId: module.id, position: unit.position } },
          });
          if (conflict && conflict.code !== unit.code)
            throw Error("Unit position conflict; no existing content moved");
          const study = await tx.studyUnit.upsert({
            where: { moduleId_code: { moduleId: module.id, code: unit.code } },
            create: {
              moduleId: module.id,
              code: unit.code,
              title: unit.title,
              position: unit.position,
            },
            update: { title: unit.title },
          });
          const ref = unit.references.find((r: any) => r.source === "mat1503-resource");
          const source = plan.sources.find((s: any) => s.id === ref.source);
          const sourceUrl = `/api/sources/${source.id}?sha=${source.sha256}#page=${ref.pageStart}`;
          const criterion = await tx.assessmentCriterion.upsert({
            where: {
              qualificationId_code: {
                qualificationId: qualification.id,
                code: `LOCAL-${unit.code}`,
              },
            },
            create: {
              qualificationId: qualification.id,
              code: `LOCAL-${unit.code}`,
              description: `Apply and explain ${unit.title.toLowerCase()}, justify mathematical conditions, diagnose mistakes and transfer the method to a new context. Local Vela curriculum mapping based on supplied historical resources; not verified SAQA or CAPS criteria.`,
              sourceUrl,
              authority: "CURRICULUM",
            },
            update: {},
          });
          await tx.learningOutcome.upsert({
            where: { studyUnitId_code: { studyUnitId: study.id, code: "LO1" } },
            create: {
              studyUnitId: study.id,
              code: "LO1",
              position: 1,
              description: mat1503Skills[unit.code].join(" "),
              assessmentCriteria: { connect: { id: criterion.id } },
            },
            update: {
              description: mat1503Skills[unit.code].join(" "),
              assessmentCriteria: { connect: { id: criterion.id } },
            },
          });
        }
      },
      { maxWait: 10000, timeout: 120000 },
    );
    console.log(
      `Registered13 MAT1503 units under existing module ${module.id}; criteria explicitly CURRICULUM. No historical policy promoted to current policy.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Registration failed");
  process.exitCode = 1;
});

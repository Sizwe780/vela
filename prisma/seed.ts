import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { psmFirstLevel, psmQualification } from "../lib/curriculum/psm-first-level";
import { transactionLock } from "../lib/teaching/scope";

const url = new URL(process.env.DATABASE_URL!);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const sslmode = url.searchParams.get("sslmode");
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: sslmode === "disable" || local ? false : { rejectUnauthorized: true },
  }),
});

async function seed() {
  return prisma.$transaction(
    async (tx) => {
      const { institution, code, stream, sourceUrl } = psmQualification;
      await transactionLock(tx, "vela:institution:" + institution);
      const metadata = {
        title: "Bachelor of Education in Senior Phase and Further Education and Training Teaching",
        streamTitle: "Physical Science and Mathematics",
        saqaId: "103108",
        nqfExitLevel: 7,
        sourceUrl,
      };
      const qualification = await tx.qualification.upsert({
        where: { institution_code_stream: { institution, code, stream } },
        create: { institution, code, stream, ...metadata },
        update: metadata,
      });
      await transactionLock(tx, "vela:qualification:" + qualification.id);
      const current = await tx.qualificationModule.findMany({
        where: { qualificationId: qualification.id },
        select: {
          moduleId: true,
          studyYear: true,
          position: true,
          archivedAt: true,
          acceptingEnrollments: true,
          module: { select: { code: true } },
        },
      });
      let position = Math.max(
        0,
        ...current.filter((link) => link.studyYear === 1).map((link) => link.position),
      );
      let added = 0;
      let opened = 0;
      const openPlaceholders = process.argv.includes("--open-first-level-placeholders");
      for (const entry of psmFirstLevel) {
        const catalogNote =
          [
            ...(entry.note ? [entry.note] : []),
            ...(entry.coRequisites?.length
              ? ["UNISA PSM co-requisites: " + entry.coRequisites.join(", ") + "."]
              : []),
          ].join(" ") || null;
        const module = await tx.module.upsert({
          where: { institution_code: { institution, code: entry.code } },
          create: { institution, code: entry.code, title: entry.title, catalogNote },
          update: { title: entry.title, catalogNote },
          select: { id: true },
        });
        const link = current.find((row) => row.moduleId === module.id);
        if (link && link.studyYear !== 1)
          throw new Error(
            entry.code + " already belongs to a different level; review before moving it.",
          );
        if (link) {
          if (openPlaceholders && !link.archivedAt && !link.acceptingEnrollments) {
            await tx.qualificationModule.update({
              where: {
                qualificationId_moduleId: {
                  qualificationId: qualification.id,
                  moduleId: module.id,
                },
              },
              data: { acceptingEnrollments: true },
            });
            opened++;
          }
          continue;
        }
        await tx.qualificationModule.create({
          data: {
            qualificationId: qualification.id,
            moduleId: module.id,
            studyYear: 1,
            position: ++position,
            acceptingEnrollments: true,
          },
        });
        added++;
      }
      const legacy = current.find((link) => link.module.code === "PHY1501");
      if (legacy && !legacy.archivedAt) {
        await tx.qualificationModule.update({
          where: {
            qualificationId_moduleId: {
              qualificationId: qualification.id,
              moduleId: legacy.moduleId,
            },
          },
          data: { acceptingEnrollments: false, archivedAt: new Date() },
        });
      }
      return {
        added,
        opened,
        present: psmFirstLevel.length,
        archivedLegacyLink: !!legacy && !legacy.archivedAt,
      };
    },
    { maxWait: 15_000, timeout: 90_000 },
  );
}

seed()
  .then((result) => console.log("UNISA 90104-PSM first-level catalogue", JSON.stringify(result)))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

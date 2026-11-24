import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { assertCurriculumScope } from "../lib/content/curriculum-scope";
import { z } from "zod";

// Run only with reviewed curriculum metadata. This does not infer criteria.
const schema = z.object({
  moduleCode: z.string().regex(/^[A-Z]{3}[0-9]{4}$/),
  qualificationCode: z.string().default("90104"),
  stream: z.string().default("PSM"),
  studyUnit: z.object({
    code: z.string().min(1),
    title: z.string().min(1),
    position: z.number().int().positive(),
  }),
  learningOutcome: z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    position: z.number().int().positive(),
  }),
  assessmentCriterion: z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    sourceUrl: z.string().url(),
  }),
});
const prisma = new PrismaClient();

async function main() {
  const filename = process.argv[2];
  if (!filename)
    throw new Error("Usage: npm run curriculum:register -- path/to/reviewed-curriculum.json");
  const data = schema.parse(JSON.parse(await readFile(filename, "utf8")));
  assertCurriculumScope("UNISA", data.moduleCode, data.studyUnit.code, data.studyUnit.position);
  const result = await prisma.$transaction(async (tx) => {
    const qualification = await tx.qualification.findUniqueOrThrow({
      where: {
        institution_code_stream: {
          institution: "UNISA",
          code: data.qualificationCode,
          stream: data.stream,
        },
      },
    });
    const module = await tx.module.findUniqueOrThrow({
      where: { institution_code: { institution: "UNISA", code: data.moduleCode } },
    });
    await tx.qualificationModule.findUniqueOrThrow({
      where: {
        qualificationId_moduleId: { qualificationId: qualification.id, moduleId: module.id },
      },
    });
    const studyUnit = await tx.studyUnit.upsert({
      where: { moduleId_code: { moduleId: module.id, code: data.studyUnit.code } },
      create: { moduleId: module.id, ...data.studyUnit },
      update: data.studyUnit,
    });
    const criterion = await tx.assessmentCriterion.upsert({
      where: {
        qualificationId_code: {
          qualificationId: qualification.id,
          code: data.assessmentCriterion.code,
        },
      },
      create: { qualificationId: qualification.id, ...data.assessmentCriterion },
      update: data.assessmentCriterion,
    });
    const learningOutcome = await tx.learningOutcome.upsert({
      where: { studyUnitId_code: { studyUnitId: studyUnit.id, code: data.learningOutcome.code } },
      create: {
        studyUnitId: studyUnit.id,
        ...data.learningOutcome,
        assessmentCriteria: { connect: { id: criterion.id } },
      },
      update: { ...data.learningOutcome, assessmentCriteria: { connect: { id: criterion.id } } },
    });
    return {
      moduleCode: module.code,
      studyUnitId: studyUnit.id,
      learningOutcomeId: learningOutcome.id,
      assessmentCriterionId: criterion.id,
    };
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

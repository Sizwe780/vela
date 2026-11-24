import { Prisma } from "../../generated/app-client";

export const retiredOrientation = {
  institution: "UNISA",
  moduleCode: "BPT1501",
  unitCode: "BPT1501-U1",
} as const;

export const publishedStudyUnit = {
  NOT: {
    code: retiredOrientation.unitCode,
    module: { institution: retiredOrientation.institution, code: retiredOrientation.moduleCode },
  },
} satisfies Prisma.StudyUnitWhereInput;

// For SQL queries where the joined StudyUnit is aliased as u.
export const publishedStudyUnitSql = Prisma.sql`NOT (
  u.code = ${retiredOrientation.unitCode} AND EXISTS (
    SELECT 1 FROM "Module" m WHERE m.id = u."moduleId"
      AND m.institution = ${retiredOrientation.institution} AND m.code = ${retiredOrientation.moduleCode}
  )
)`;

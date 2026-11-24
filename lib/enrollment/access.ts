import "server-only";
import { publishedStudyUnit, publishedStudyUnitSql } from "../study/published-units";
import { prisma } from "../db";
import { IngestError } from "../ingest/errors";
import { registeredSource } from "../study/source-catalog";
export async function hasModuleAccess(studentId: string, moduleId: string) {
  return !!(await prisma.enrollment.findFirst({
    where: { studentId, moduleId, status: { in: ["active", "completed"] } },
    select: { id: true },
  }));
}
export async function requireModuleAccess(studentId: string, moduleId: string) {
  if (!(await hasModuleAccess(studentId, moduleId)))
    throw new IngestError(
      403,
      "ENROLLMENT_REQUIRED",
      "Enroll in this module to access its learning materials.",
    );
}
export async function requireUnitAccess(studentId: string, unitId: string) {
  const units = await prisma.studyUnit.findMany({
    where: { ...publishedStudyUnit, OR: [{ id: unitId }, { code: unitId }] },
    take: 2,
    select: { id: true, moduleId: true },
  });
  if (units.length !== 1) throw new IngestError(404, "UNIT_NOT_FOUND", "Study unit not found.");
  await requireModuleAccess(studentId, units[0].moduleId);
  return units[0].id;
}
export async function requireSourceAccess(studentId: string, document: string) {
  const legacy = ["guide", "stewart"].includes(document);
  const source = legacy ? null : await registeredSource(document);
  if (!legacy && !source) throw new IngestError(404, "SOURCE_NOT_FOUND", "Source not found.");
  // Registered sources specify an institution; legacy sources belong to UNISA.
  const module = await prisma.module.findUnique({
    where: {
      institution_code: {
        institution: source?.institution ?? "UNISA",
        code: source?.moduleCode ?? "MAT1512",
      },
    },
    select: { id: true },
  });
  if (!module) throw new IngestError(404, "SOURCE_NOT_FOUND", "Source module not found.");
  const reviewer = await prisma.qualificationModule.findFirst({
    where: {
      moduleId: module.id,
      qualification: {
        staffMemberships: {
          some: {
            studentId,
            role: { in: ["staff", "admin"] },
          },
        },
      },
    },
    select: { qualificationId: true },
  });
  if (!reviewer) await requireModuleAccess(studentId, module.id);
}
export async function requireFigureAccess(studentId: string, asset: string) {
  if (!/^[a-f0-9]{64}\.(png|pdf)$/.test(asset))
    throw new IngestError(404, "SOURCE_NOT_FOUND", "Source not found.");
  // Match exact JSON asset membership, never a user-controlled path or substring.
  const result = await prisma.$queryRaw<
    { id: string }[]
  >`SELECT i.id FROM "Ingestion" i JOIN "LearningOutcome" lo ON lo.id=i."learningOutcomeId" JOIN "StudyUnit" u ON u.id=lo."studyUnitId" WHERE ${publishedStudyUnitSql} AND EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."moduleId"=u."moduleId" AND e."studentId"=${studentId} AND e.status IN ('active','completed')) AND EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(i."structuredContent"->'blocks')='array' THEN i."structuredContent"->'blocks' ELSE '[]'::jsonb END) b WHERE b->>'type'='figure' AND (b->>'asset'=${asset} OR (b->>'vectorAsset'=${asset} AND i."structuredContent"->'parser'->>'review'='source-compared'))) LIMIT 1`;
  if (!result.length)
    throw new IngestError(
      403,
      "ENROLLMENT_REQUIRED",
      "Enroll in the source module to view this illustration.",
    );
}

import { IngestError } from "../ingest/errors";
import type { Prisma } from "../../generated/app-client";

export type Tx = Prisma.TransactionClient;

export function forbidden(
  message = "This action requires access to the selected qualification.",
): never {
  throw new IngestError(403, "TEACHING_SCOPE_REQUIRED", message);
}

export function missing(message: string): never {
  throw new IngestError(404, "TEACHING_ITEM_MISSING", message);
}

export function conflict(message: string): never {
  throw new IngestError(409, "TEACHING_CONFLICT", message);
}

export async function teachingRole(
  tx: Tx,
  studentId: string,
  qualificationId: string,
  admin = false,
) {
  const result = await tx.staffMembership.findUnique({
    where: { studentId_qualificationId: { studentId, qualificationId } },
    select: { role: true },
  });
  if (result?.role !== "admin" && (admin || result?.role !== "staff")) forbidden();
  return result?.role === "admin" ? "admin" : "staff";
}

export async function moduleLink(tx: Tx, qualificationId: string, moduleId: string) {
  const row = await tx.qualificationModule.findUnique({
    where: { qualificationId_moduleId: { qualificationId, moduleId } },
  });
  return row ?? missing("Module not found in the selected qualification.");
}

export async function cohortLink(tx: Tx, qualificationId: string, id?: string) {
  if (!id) return;
  if (
    !(await tx.teachingCohort.findFirst({ where: { id, qualificationId }, select: { id: true } }))
  )
    missing("Cohort not found in the selected qualification.");
}

export async function recordAudit(
  tx: Tx,
  qualificationId: string,
  actorId: string,
  action: string,
  targetId: string,
) {
  await tx.teachingAudit.create({ data: { qualificationId, actorId, action, targetId } });
}

export async function transactionLock(tx: Tx, key: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`;
}

import "server-only";
import { prisma } from "../db";
import { IngestError } from "../ingest/errors";
export async function staffScopes(studentId: string) {
  const memberships = await prisma.staffMembership.findMany({
    where: { studentId, role: { in: ["staff", "admin"] } },
    select: { qualificationId: true, role: true },
  });
  if (!memberships.length)
    throw new IngestError(
      403,
      "STAFF_REQUIRED",
      "Staff access is limited to assigned qualifications.",
    );
  return memberships;
}

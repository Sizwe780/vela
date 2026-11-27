import type { Prisma } from "../../generated/app-client";

export function learnerEnrollments(studentId: string) {
  return { studentId, status: { in: ["active", "completed"] as ("active" | "completed")[] } };
}

export function learnerAssignments(studentId: string): Prisma.TeachingAssignmentWhereInput {
  return {
    OR: [{ cohortId: null }, { cohort: { members: { some: { studentId } } } }],
    qualificationModule: { enrollments: { some: learnerEnrollments(studentId) } },
  };
}

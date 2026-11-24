import { institutionScopes } from "../../../lib/institution/access";
import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { moduleCapabilities, combineCapabilities } from "../../../lib/capabilities";
import { publicError } from "../../../lib/ingest/errors";
export async function GET() {
  try {
    const learner = await requireLearner();
    const modules = await prisma.module.findMany({
      where: {
        qualifications: {
          some: {
            enrollments: {
              some: { studentId: learner.id, status: { in: ["active", "completed"] } },
            },
          },
        },
      },
      select: { institution: true, code: true, metadata: true },
    });
    const canModerate = !!(await prisma.staffMembership.findFirst({
      where: { studentId: learner.id, role: { in: ["staff", "admin"] } },
      select: { studentId: true },
    }));
    const [scope, profile] = await Promise.all([
      institutionScopes(prisma, learner),
      prisma.studentProfile.findUnique({
        where: { studentId: learner.id },
        select: { classroomAlerts: true },
      }),
    ]);
    const assigned = { studentId: learner.id };
    const classroomDue =
      profile?.classroomAlerts === false
        ? 0
        : await prisma.teachingAssignment.count({
            where: {
              dueAt: { gt: new Date() },
              submissions: { none: assigned },
              OR: [{ cohortId: null }, { cohort: { members: { some: assigned } } }],
              qualificationModule: {
                enrollments: { some: { ...assigned, status: { in: ["active", "completed"] } } },
              },
            },
          });
    return Response.json(
      {
        ownerId: learner.id,
        canModerate,
        classroomDue,
        institutions: scope.map((item) => item.institution),
        capabilities: combineCapabilities(
          modules.map((m) => moduleCapabilities(m.institution, m.code, m.metadata)),
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const f = publicError(e);
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

import { publishedStudyUnit } from "../../../lib/study/published-units";
import { prisma } from "../../../lib/db";
import { requireLearner } from "../../../lib/auth/server";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { readJson } from "../../../lib/ingest/http";
import { IngestError, publicError } from "../../../lib/ingest/errors";
import { enrollmentInput } from "../../../lib/enrollment/input";
import { logServerError } from "../../../lib/log-error";
import { enqueueWelcome } from "../../../lib/email/service";
import { transactionLock } from "../../../lib/teaching/scope";
import { isPsmQualification } from "../../../lib/curriculum/psm-first-level";
import {
  checkPsmSelection,
  currentStudyPeriod,
  psmWithdrawalConflict,
} from "../../../lib/curriculum/psm-enrollment";
import type { Prisma } from "../../../generated/app-client";

async function psmPlan(tx: Prisma.TransactionClient, studentId: string, qualificationId: string) {
  const rows = await tx.enrollment.findMany({
    where: { studentId, qualificationId, status: { in: ["active", "completed"] } },
    select: {
      status: true,
      enrolledAt: true,
      studyPlanYear: true,
      studyPlanSemester: true,
      qualificationModule: { select: { module: { select: { code: true } } } },
    },
  });
  return rows.flatMap((row) => {
    if (row.status === "withdrawn") return [];
    const inferred = currentStudyPeriod(row.enrolledAt);
    return [
      {
        code: row.qualificationModule.module.code,
        status: row.status,
        year: row.studyPlanYear ?? inferred.year,
        semester: row.studyPlanSemester ?? inferred.semester,
      },
    ];
  });
}

const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  if (!(error instanceof IngestError)) logServerError("enrollment", error);
  const f = publicError(
    error instanceof IngestError
      ? error
      : new IngestError(503, "ENROLLMENT_UNAVAILABLE", "Enrollment is unavailable. Please retry."),
  );
  return Response.json({ error: f.error }, { status: f.status, headers });
}
export async function GET() {
  try {
    const learner = await requireLearner();
    const moduleSelection = {
      id: true,
      code: true,
      title: true,
      studyUnits: {
        where: publishedStudyUnit,
        orderBy: { position: "asc" as const },
        select: { id: true, code: true, title: true, _count: { select: { sessions: true } } },
      },
    };
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: learner.id },
      orderBy: { enrolledAt: "asc" },
      select: {
        id: true,
        qualificationId: true,
        moduleId: true,
        status: true,
        enrolledAt: true,
        studyPlanYear: true,
        studyPlanSemester: true,
        qualificationModule: {
          select: {
            studyYear: true,
            qualification: {
              select: { id: true, code: true, title: true, institution: true, streamTitle: true },
            },
            module: { select: moduleSelection },
          },
        },
      },
    });

    return Response.json({ enrollments }, { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const parsed = enrollmentInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_ENROLLMENT",
        "Select a qualification and up to 40 distinct modules; learner identity is supplied by your session.",
      );
    const input = parsed.data;
    await prisma.$transaction(
      async (tx) => {
        if (input.action === "enroll") {
          await transactionLock(tx, `vela:qualification:${input.qualificationId}`);
          await enqueueWelcome(tx, learner.id);
          const links = await tx.qualificationModule.findMany({
            where: { qualificationId: input.qualificationId, moduleId: { in: input.moduleIds } },
            select: {
              moduleId: true,
              acceptingEnrollments: true,
              archivedAt: true,
              module: { select: { code: true } },
              qualification: {
                select: { archivedAt: true, institution: true, code: true, stream: true },
              },
            },
          });
          if (links.length !== input.moduleIds.length)
            throw new IngestError(
              400,
              "MODULE_NOT_IN_QUALIFICATION",
              "Every selected module must belong to this qualification.",
            );
          const settings = await tx.teachingSettings.findUnique({
            where: { qualificationId: input.qualificationId },
          });
          const closed = links.filter(
            (link) =>
              settings?.allowSelfEnrollment === false ||
              !link.acceptingEnrollments ||
              link.archivedAt ||
              link.qualification.archivedAt,
          );
          if (closed.length) {
            const active = await tx.enrollment.count({
              where: {
                studentId: learner.id,
                qualificationId: input.qualificationId,
                status: { in: ["active", "completed"] },
                moduleId: { in: closed.map((link) => link.moduleId) },
              },
            });
            if (active !== closed.length)
              throw new IngestError(
                403,
                "ENROLLMENT_INVITE_REQUIRED",
                "Self-enrolment is closed for one or more selected modules. Ask your qualification administrator for an invitation.",
              );
          }
          const qualification = links[0].qualification;
          const isPsm = isPsmQualification(qualification);
          const current = currentStudyPeriod();
          const year = input.year ?? current.year;
          const semester = input.semester ?? current.semester;
          const period = isPsm ? { studyPlanYear: year, studyPlanSemester: semester } : {};
          if (isPsm) {
            if (year < current.year || year > current.year + 1)
              throw new IngestError(
                400,
                "INVALID_STUDY_YEAR",
                "Choose the current or next academic year.",
              );
            const issue = checkPsmSelection({
              codes: links.map((link) => link.module.code),
              existing: await psmPlan(tx, learner.id, input.qualificationId),
              year,
              semester,
              languageConfirmed: input.languageConfirmed === true,
            });
            if (issue) throw new IngestError(409, "PSM_SELECTION_RULE", issue);
          }
          await tx.enrollment.createMany({
            data: input.moduleIds.map((moduleId) => ({
              studentId: learner.id,
              qualificationId: input.qualificationId,
              moduleId,
              status: "active",
              ...period,
            })),
            skipDuplicates: true,
          });
          await tx.enrollment.updateMany({
            where: {
              studentId: learner.id,
              qualificationId: input.qualificationId,
              moduleId: { in: input.moduleIds },
              status: "withdrawn",
            },
            data: { status: "active", ...period },
          });
        } else {
          const enrollment = await tx.enrollment.findFirst({
            where: { id: input.enrollmentId, studentId: learner.id },
          });
          if (!enrollment)
            throw new IngestError(
              404,
              "ENROLLMENT_NOT_FOUND",
              "Enrollment not found for your account.",
            );
          await transactionLock(tx, `vela:qualification:${enrollment.qualificationId}`);
          await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${learner.id + ":" + enrollment.moduleId},0))) enrollment_gate`;
          if (input.action === "withdraw") {
            const current = await tx.enrollment.findUniqueOrThrow({
              where: { id: enrollment.id },
              include: {
                qualificationModule: {
                  include: { qualification: true, module: { select: { code: true } } },
                },
              },
            });
            const link = current.qualificationModule;
            if (current.status !== "withdrawn" && isPsmQualification(link.qualification)) {
              const conflict = psmWithdrawalConflict(
                link.module.code,
                current.studyPlanYear ?? currentStudyPeriod(current.enrolledAt).year,
                await psmPlan(tx, learner.id, enrollment.qualificationId),
                current.status === "completed",
              );
              if (conflict)
                throw new IngestError(
                  409,
                  "PSM_COREQUISITE_REQUIRED",
                  "Withdraw from " + conflict + " before removing its co-requisite.",
                );
            }
          }
          if (input.action === "complete") {
            const current = await tx.enrollment.findUniqueOrThrow({
              where: { id: enrollment.id },
              select: { status: true },
            });
            if (current.status === "withdrawn")
              throw new IngestError(
                409,
                "ENROLLMENT_WITHDRAWN",
                "Re-enroll before completing this module.",
              );
            const total = await tx.studySession.count({
              where: { studyUnit: { ...publishedStudyUnit, moduleId: enrollment.moduleId } },
            });
            const done = await tx.sessionProgress.count({
              where: {
                studentId: learner.id,
                session: { studyUnit: { ...publishedStudyUnit, moduleId: enrollment.moduleId } },
              },
            });
            if (!total || done !== total)
              throw new IngestError(
                409,
                "SESSIONS_INCOMPLETE",
                "Finish all published sessions before marking this module complete. Completion is not an institutional grade.",
              );
          }
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { status: input.action === "withdraw" ? "withdrawn" : "completed" },
          });
        }
      },
      { maxWait: 10000, timeout: 20000 },
    );
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return failure(e);
  }
}

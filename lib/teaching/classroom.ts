import { IngestError } from "../ingest/errors";
import { rubricPoints, type TeachingCommand } from "./input";
import {
  cohortLink,
  conflict,
  forbidden,
  missing,
  moduleLink,
  recordAudit,
  transactionLock,
  type Tx,
} from "./scope";

export async function classroomCommand(
  tx: Tx,
  actor: string,
  input: Extract<
    TeachingCommand,
    {
      action: "createCohort" | "cohortMember" | "createAssignment" | "grade" | "announce";
    }
  >,
) {
  const { qualificationId } = input;
  let targetId: string;
  switch (input.action) {
    case "createCohort": {
      const existing = await tx.teachingCohort.findUnique({
        where: { qualificationId_name: { qualificationId, name: input.name } },
      });
      if (existing) return conflict("A cohort already has this name.");
      targetId = (await tx.teachingCohort.create({ data: { qualificationId, name: input.name } }))
        .id;
      break;
    }
    case "cohortMember": {
      await cohortLink(tx, qualificationId, input.cohortId);
      const key = { cohortId: input.cohortId, studentId: input.studentId };
      if (input.member) {
        if (
          !(await tx.enrollment.findFirst({
            where: {
              qualificationId,
              studentId: input.studentId,
              status: { in: ["active", "completed"] },
            },
            select: { id: true },
          }))
        )
          return missing("Select a learner enrolled in this qualification.");
        await tx.teachingCohortMember.upsert({
          where: { cohortId_studentId: key },
          create: key,
          update: {},
        });
      } else {
        await tx.teachingCohortMember.deleteMany({ where: key });
      }
      targetId = input.cohortId;
      break;
    }
    case "createAssignment": {
      await moduleLink(tx, qualificationId, input.moduleId);
      await cohortLink(tx, qualificationId, input.cohortId);
      const dueAt = new Date(input.dueAt);
      if (dueAt <= new Date())
        throw new IngestError(422, "INVALID_DUE_DATE", "Choose a future due date.");
      targetId = (
        await tx.teachingAssignment.create({
          data: {
            qualificationId,
            moduleId: input.moduleId,
            cohortId: input.cohortId,
            title: input.title,
            instructions: input.instructions,
            rubric: input.rubric,
            dueAt,
            authorId: actor,
          },
        })
      ).id;
      break;
    }
    case "grade": {
      const assignment = await tx.teachingAssignment.findFirst({
        where: { id: input.assignmentId, qualificationId },
        select: { id: true, rubric: true },
      });
      if (!assignment) return missing("Assignment not found in this qualification.");
      if (!rubricPoints(assignment.rubric, input.scores))
        throw new IngestError(
          422,
          "INVALID_RUBRIC_SCORES",
          "Enter a score within the maximum for every rubric criterion.",
        );
      const changed = await tx.teachingSubmission.updateMany({
        where: {
          assignmentId: assignment.id,
          studentId: input.studentId,
          submittedAt: input.expectedSubmittedAt,
          gradedAt: null,
        },
        data: {
          scores: input.scores,
          feedback: input.feedback,
          graderId: actor,
          gradedAt: new Date(),
        },
      });
      if (!changed.count) return conflict("The submission changed or has already been graded.");
      targetId = assignment.id;
      break;
    }
    case "announce": {
      await cohortLink(tx, qualificationId, input.cohortId);
      targetId = (
        await tx.teachingAnnouncement.create({
          data: {
            qualificationId,
            cohortId: input.cohortId,
            title: input.title,
            body: input.body,
            authorId: actor,
          },
        })
      ).id;
      break;
    }
  }
  await recordAudit(tx, qualificationId, actor, input.action, targetId);
  return { id: targetId };
}

export async function submitAssignment(
  tx: Tx,
  studentId: string,
  input: {
    assignmentId: string;
    body: string;
    expectedSubmittedAt?: string;
  },
) {
  const scope = await tx.teachingAssignment.findUnique({
    where: { id: input.assignmentId },
    select: { qualificationId: true },
  });
  if (!scope) return forbidden("You do not have access to this assignment.");
  await transactionLock(tx, `vela:qualification:${scope.qualificationId}`);
  await transactionLock(tx, `vela:submission:${studentId}:${input.assignmentId}`);
  const assignment = await tx.teachingAssignment.findFirst({
    where: {
      id: input.assignmentId,
      OR: [{ cohortId: null }, { cohort: { members: { some: { studentId } } } }],
      qualificationModule: {
        enrollments: { some: { studentId, status: { in: ["active", "completed"] } } },
      },
    },
    select: { id: true, dueAt: true },
  });
  if (!assignment) return forbidden("You do not have access to this assignment.");
  const key = { studentId, assignmentId: assignment.id };
  const existing = await tx.teachingSubmission.findUnique({
    where: { assignmentId_studentId: key },
  });
  if (existing?.body === input.body) return { submittedAt: existing.submittedAt };
  if (assignment.dueAt <= new Date()) return conflict("This assignment is closed.");
  if (existing) {
    if (existing.gradedAt || existing.submittedAt.toISOString() !== input.expectedSubmittedAt)
      return conflict("The submission was graded or changed elsewhere. Reload before editing.");
    const submittedAt = new Date();
    const updated = await tx.teachingSubmission.updateMany({
      where: { ...key, submittedAt: existing.submittedAt, gradedAt: null },
      data: { body: input.body, submittedAt },
    });
    if (!updated.count) return conflict("The submission was graded while you were editing.");
    return { submittedAt };
  }
  return tx.teachingSubmission.create({
    data: { ...key, body: input.body },
    select: { submittedAt: true },
  });
}

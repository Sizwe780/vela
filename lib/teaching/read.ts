import "server-only";
import { Prisma } from "../../generated/app-client";
import { prisma } from "../db";
import { teachingRole, missing } from "./scope";

export async function teachingWorkspace(
  actor: string,
  qualificationId?: string,
  assignmentId?: string,
  sourceUnitId?: string,
) {
  const scopes = await prisma.staffMembership.findMany({
    where: { studentId: actor, role: { in: ["staff", "admin"] } },
    select: {
      qualificationId: true,
      role: true,
      qualification: { select: { title: true, code: true, institution: true } },
    },
    orderBy: { qualification: { code: "asc" } },
  });
  if (!qualificationId) return { ownerId: actor, scopes, workspace: null };
  const role = await teachingRole(prisma, actor, qualificationId);
  const scope = { qualificationId };
  const [
    qualification,
    cohorts,
    enrollments,
    drafts,
    assignments,
    announcements,
    audit,
    members,
    invitations,
    sources,
  ] = await Promise.all([
    prisma.qualification.findUnique({
      where: { id: qualificationId },
      select: {
        title: true,
        institution: true,
        code: true,
        teachingSettings: true,
        modules: {
          orderBy: [{ studyYear: "asc" }, { position: "asc" }],
          select: {
            acceptingEnrollments: true,
            studyYear: true,
            module: {
              select: {
                id: true,
                code: true,
                title: true,
                studyUnits: {
                  orderBy: { position: "asc" },
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    sessions: {
                      orderBy: { position: "asc" },
                      select: { id: true, title: true, version: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: { enrollments: { where: { status: { in: ["active", "completed"] } } } },
            },
          },
        },
      },
    }),
    prisma.teachingCohort.findMany({
      where: scope,
      orderBy: { name: "asc" },
      include: { members: true },
    }),
    prisma.enrollment.findMany({
      where: scope,
      take: 300,
      orderBy: [{ enrolledAt: "desc" }, { id: "asc" }],
      select: { id: true, studentId: true, moduleId: true, status: true },
    }),
    prisma.lessonDraft.findMany({
      where: { ...scope, factoryProvenance: { equals: Prisma.DbNull } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        markdown: true,
        studyUnitId: true,
        sessionId: true,
        authorId: true,
        reviewNote: true,
        status: true,
        publishVersion: true,
        updatedAt: true,
        previous: true,
      },
    }),
    prisma.teachingAssignment.findMany({
      where: scope,
      orderBy: { dueAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        moduleId: true,
        dueAt: true,
        cohortId: true,
        rubric: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.teachingAnnouncement.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, title: true, body: true, createdAt: true, cohortId: true },
    }),
    role === "admin"
      ? prisma.teachingAudit.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 50 })
      : [],
    role === "admin"
      ? prisma.staffMembership.findMany({
          where: scope,
          select: { studentId: true, role: true, profile: { select: { displayName: true } } },
          orderBy: { studentId: "asc" },
        })
      : [],
    role === "admin"
      ? prisma.teachingInvite.findMany({
          where: scope,
          orderBy: { expiresAt: "desc" },
          take: 40,
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            usedAt: true,
            revokedAt: true,
          },
        })
      : [],
    sourceUnitId
      ? prisma.ingestion.findMany({
          where: {
            structuredContent: { not: Prisma.DbNull },
            learningOutcome: {
              studyUnit: {
                id: sourceUnitId,
                module: { qualifications: { some: scope } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, sourceName: true, structuredContent: true },
        })
      : [],
  ]);
  if (!qualification) return missing("Qualification not found.");
  const sourceReviews = sources.length
    ? await prisma.sourceReview.findMany({
        where: { qualificationId, ingestionId: { in: sources.map((source) => source.id) } },
      })
    : [];
  const submissionRows = assignmentId
    ? await prisma.teachingSubmission.findMany({
        where: { assignmentId, assignment: { qualificationId } },
        orderBy: { submittedAt: "desc" },
        take: 50,
        select: {
          studentId: true,
          body: true,
          submittedAt: true,
          gradedAt: true,
          scores: true,
          feedback: true,
        },
      })
    : [];
  const people = await prisma.studentProfile.findMany({
    where: {
      studentId: {
        in: [...new Set([...enrollments, ...submissionRows].map((row) => row.studentId))],
      },
    },
    select: { studentId: true, displayName: true },
  });
  return {
    ownerId: actor,
    scopes,
    workspace: {
      qualification,
      role,
      cohorts,
      enrollments,
      drafts,
      assignments,
      announcements,
      audit,
      members,
      invitations,
      submissions: submissionRows,
      sources,
      sourceReviews,
      people,
    },
  };
}

export async function learnerClassroom(studentId: string) {
  const enrolled = {
    studentId,
    status: { in: ["active", "completed"] as ("active" | "completed")[] },
  };
  const audience = { OR: [{ cohortId: null }, { cohort: { members: { some: { studentId } } } }] };
  const [assignments, announcements] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { ...audience, qualificationModule: { enrollments: { some: enrolled } } },
      select: {
        id: true,
        title: true,
        instructions: true,
        rubric: true,
        dueAt: true,
        qualificationModule: { select: { module: { select: { title: true, code: true } } } },
        submissions: {
          where: { studentId },
          select: { body: true, submittedAt: true, gradedAt: true, scores: true, feedback: true },
        },
      },
      orderBy: { dueAt: "asc" },
      take: 100,
    }),
    prisma.teachingAnnouncement.findMany({
      where: {
        ...audience,
        qualification: { modules: { some: { enrollments: { some: enrolled } } } },
      },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        qualification: {
          select: {
            title: true,
            teachingSettings: { select: { displayName: true, supportEmail: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  return { ownerId: studentId, assignments, announcements };
}

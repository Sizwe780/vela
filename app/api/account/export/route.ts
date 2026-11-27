import { requireLearner } from "../../../../lib/auth/server";
import { prisma } from "../../../../lib/db";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";

export async function GET() {
  try {
    const user = await requireLearner();
    const where = { studentId: user.id };
    const [
      profile,
      enrollments,
      mastery,
      notes,
      saved,
      readingProgress,
      positions,
      activity,
      practice,
      quizzes,
      concepts,
      conceptPractice,
      conceptChecks,
      preferences,
      classSubmissions,
      peerPosts,
      support,
      lessonAttempts,
      lessonAttemptSubmissions,
    ] = await prisma.$transaction(
      [
        prisma.studentProfile.findUnique({
          where,
          select: {
            displayName: true,
            weeklyGoalMinutes: true,
            emailReminders: true,
            emailConsentAt: true,
            classroomAlerts: true,
            autoStartTimer: true,
            staffMemberships: { select: { qualificationId: true, role: true } },
          },
        }),
        prisma.enrollment.findMany({ where }),
        prisma.studentMastery.findMany({ where }),
        prisma.studyNote.findMany({ where }),
        prisma.studyBookmark.findMany({ where }),
        prisma.sessionProgress.findMany({ where }),
        prisma.studyPosition.findMany({ where }),
        prisma.studyActivityDay.findMany({ where }),
        prisma.practiceNotebook.findMany({ where }),
        prisma.quizAttempt.findMany({
          where,
          select: { id: true, studyUnitId: true, createdAt: true, submittedAt: true, result: true },
        }),
        prisma.learningConceptState.findMany({ where }),
        prisma.conceptAttempt.findMany({
          where,
          select: {
            id: true,
            sessionId: true,
            learningOutcomeId: true,
            submittedAt: true,
            explanation: true,
            score: true,
            result: true,
            pointsAwarded: true,
          },
        }),
        prisma.conceptCheck.findMany({
          where,
          select: { id: true, conceptId: true, moduleId: true, submittedAt: true, result: true },
        }),
        prisma.learningPreference.findUnique({ where }),
        prisma.teachingSubmission.findMany({
          where,
          select: {
            assignmentId: true,
            body: true,
            submittedAt: true,
            gradedAt: true,
            scores: true,
            feedback: true,
          },
        }),
        prisma.discussionPost.findMany({
          where,
          select: { id: true, studyUnitId: true, body: true, createdAt: true, deletedAt: true },
        }),
        prisma.supportRequest.findMany({
          where,
          select: {
            id: true,
            category: true,
            status: true,
            subject: true,
            body: true,
            response: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.$queryRaw`SELECT * FROM "LessonAttempt" WHERE "studentId"=${user.id} ORDER BY "updatedAt"`,
        prisma.$queryRaw`SELECT s.* FROM "LessonAttemptSubmission" s JOIN "LessonAttempt" a ON a.id=s."attemptId" WHERE a."studentId"=${user.id} ORDER BY s."createdAt"`,
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return Response.json(
      {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        lessonAttempts,
        lessonAttemptSubmissions,
        profile,
        enrollments,
        mastery,
        notes,
        saved,
        readingProgress,
        positions,
        activity,
        practice,
        quizzes,
        concepts,
        conceptPractice,
        conceptChecks,
        preferences,
        classSubmissions,
        peerPosts,
        support,
      },
      {
        headers: {
          ...privateHeaders,
          "Content-Disposition": 'attachment; filename="vela-account.json"',
        },
      },
    );
  } catch (error) {
    return studentFailure(error);
  }
}

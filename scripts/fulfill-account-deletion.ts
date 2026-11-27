import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { transactionLock } from "../lib/teaching/scope";

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, ...value] = entry.split("=");
    return [key, value.join("=")];
  }),
);
const requestId = args.get("--request") ?? "";
const stage = args.get("--phase");
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  !/^[A-Za-z0-9_-]{1,100}$/.test(requestId) ||
  !args.get("--host") ||
  url.hostname !== args.get("--host") ||
  (stage !== "review" && stage !== "erase")
) {
  throw Error(
    "Use --request=<support request ID> --host=<exact database hostname> --phase=review|erase.",
  );
}
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: true } }),
});

async function execute() {
  await prisma.$transaction(
    async (tx) => {
      await transactionLock(tx, "vela:retention");
      const request = await tx.supportRequest.findFirst({
        where: {
          id: requestId,
          category: "deletion",
          status: "in_review",
          studentId: { not: null },
        },
        select: { studentId: true },
      });
      if (!request?.studentId) throw Error("An in-review deletion request is required.");
      const studentId = request.studentId;
      const holds = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "RetentionHold" WHERE "releasedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt">CURRENT_TIMESTAMP) AND (scope='all' OR (scope='account' AND ("targetId" IS NULL OR "targetId"=${studentId})) OR (scope='support' AND ("targetId" IS NULL OR "targetId"=${requestId}))) LIMIT 1`;
      if (holds.length)
        throw Error("Resolve the documented retention hold before account deletion.");
      await transactionLock(tx, "vela:account:" + studentId);
      const institutionOwnerships = await tx.institutionMembership.findMany({
        where: { studentId, owner: true },
        orderBy: { institution: "asc" },
      });
      for (const scope of institutionOwnerships) {
        await transactionLock(tx, "vela:institution:" + scope.institution);
        if (
          (await tx.institutionMembership.count({
            where: { institution: scope.institution, owner: true },
          })) < 2
        )
          throw Error("Assign a replacement institution owner before removing this account.");
      }
      const qualifications = await tx.staffMembership.findMany({
        where: { studentId, role: "admin" },
        orderBy: { qualificationId: "asc" },
      });
      for (const scope of qualifications) {
        await transactionLock(tx, "vela:qualification:" + scope.qualificationId);
        if (
          (await tx.staffMembership.count({
            where: { qualificationId: scope.qualificationId, role: "admin" },
          })) < 2
        )
          throw Error(
            "Assign a replacement qualification administrator before removing this account.",
          );
      }
      const authExists = (
        await tx.$queryRaw<{ present: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM neon_auth."user" WHERE id::text = ${studentId}) AS present
    `
      )[0].present;
      if (stage === "review") {
        console.log("Deletion request verified. Neon Auth account present:", authExists);
        console.log("Neon Auth subject for the restricted operator console:", studentId);
        return;
      }
      if (authExists)
        throw Error(
          "Remove the reviewed subject from Neon Auth on the same branch before erasing application records.",
        );
      if (!args.has("--apply"))
        throw Error("Use --apply after verifying the deletion request and branch.");
      const anonymousSubject = "deleted-" + requestId;
      await tx.$executeRaw`UPDATE "RetentionRun" SET "actorId"=${anonymousSubject} WHERE "actorId"=${studentId}`;
      await tx.$executeRaw`UPDATE "RetentionHold" SET "createdBy"=CASE WHEN "createdBy"=${studentId} THEN ${anonymousSubject} ELSE "createdBy" END,"releasedBy"=CASE WHEN "releasedBy"=${studentId} THEN ${anonymousSubject} ELSE "releasedBy" END WHERE "createdBy"=${studentId} OR "releasedBy"=${studentId}`;
      const where = { studentId };
      await tx.teachingSubmission.deleteMany({ where });
      await tx.teachingCohortMember.deleteMany({ where });
      await tx.$executeRaw`DELETE FROM "LessonAttempt" WHERE "studentId"=${studentId}`;
      await tx.practiceNotebook.deleteMany({ where });
      await tx.discussionReport.deleteMany({ where });
      await tx.discussionPost.updateMany({
        where,
        data: { studentId: anonymousSubject, body: "", deletedAt: new Date() },
      });
      await tx.studyRoomPresence.deleteMany({ where });
      await tx.studyPresence.deleteMany({ where });
      await tx.studyActivityDay.deleteMany({ where });
      await tx.studyBookmark.deleteMany({ where });
      await tx.studyPosition.deleteMany({ where });
      await tx.sessionProgress.deleteMany({ where });
      await tx.studyNote.deleteMany({ where });
      await tx.quizAttempt.deleteMany({ where });
      await tx.studentMastery.deleteMany({ where });
      await tx.conceptAttempt.deleteMany({ where });
      await tx.conceptCheck.deleteMany({ where });
      await tx.learningConceptState.deleteMany({ where });
      await tx.learningPreference.deleteMany({ where });
      await tx.emailDelivery.deleteMany({ where });
      await tx.enrollment.deleteMany({ where });
      await tx.institutionMembership.deleteMany({ where });
      await tx.studentProfile.deleteMany({ where });

      // Retain shared teaching records with anonymised attribution so the
      // account deletion leaves other learners' course materials intact.
      await tx.lessonDraft.deleteMany({
        where: { authorId: studentId, status: { not: "published" } },
      });
      await tx.lessonDraft.updateMany({
        where: { authorId: studentId },
        data: { authorId: anonymousSubject },
      });
      await tx.lessonDraft.updateMany({
        where: { reviewerId: studentId },
        data: { reviewerId: anonymousSubject },
      });
      await tx.sourceReview.updateMany({
        where: { reviewerId: studentId },
        data: { reviewerId: anonymousSubject },
      });
      await tx.teachingAssignment.updateMany({
        where: { authorId: studentId },
        data: { authorId: anonymousSubject },
      });
      await tx.teachingSubmission.updateMany({
        where: { graderId: studentId },
        data: { graderId: anonymousSubject },
      });
      await tx.teachingAnnouncement.updateMany({
        where: { authorId: studentId },
        data: { authorId: anonymousSubject },
      });
      await tx.teachingInvite.updateMany({
        where: { createdBy: studentId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.teachingInvite.updateMany({
        where: { createdBy: studentId },
        data: { createdBy: anonymousSubject },
      });
      await tx.teachingAudit.updateMany({
        where: { actorId: studentId },
        data: { actorId: anonymousSubject },
      });
      await tx.teachingAudit.updateMany({
        where: { targetId: studentId },
        data: { targetId: anonymousSubject },
      });
      await tx.institutionAudit.updateMany({
        where: { actorId: studentId },
        data: { actorId: anonymousSubject },
      });
      await tx.institutionAudit.updateMany({
        where: { targetId: studentId },
        data: { targetId: anonymousSubject },
      });
      await tx.supportRequest.deleteMany({ where: { ...where, id: { not: requestId } } });
      await tx.supportRequest.update({
        where: { id: requestId },
        data: {
          studentId: null,
          status: "resolved",
          body: "Account deletion completed.",
          response: null,
        },
      });
      console.log(
        "Account deletion completed. Private data removed and retained attribution anonymised.",
      );
    },
    { maxWait: 10000, timeout: 90000 },
  );
}

execute()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Account deletion failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

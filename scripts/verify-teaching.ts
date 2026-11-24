import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/app-client";
import { getAIConfig } from "../lib/ai/config";
import { adminCommand, claimInvite } from "../lib/teaching/admin";
import { classroomCommand, submitAssignment } from "../lib/teaching/classroom";
import { reviewLesson, saveLesson, submitLesson } from "../lib/teaching/content";
import { teachingRole, transactionLock } from "../lib/teaching/scope";

const rollback = Symbol("fixture rollback");
const url = new URL(process.env.DATABASE_URL ?? "");
if (!process.env.TEACHING_TEST_HOST || url.hostname !== process.env.TEACHING_TEST_HOST)
  throw Error("Set TEACHING_TEST_HOST to the exact hostname of a disposable staging branch.");
url.searchParams.delete("sslmode");
url.searchParams.delete("channel_binding");
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 20000,
  }),
});

const lesson = [
  "## Learning goal",
  "Trace a bounded algorithm and justify why the loop terminates for every valid input.",
  "## Prerequisites",
  "Read comparisons, counters and boolean conditions.",
  "## Intuition first",
  "Imagine counting tokens from two piles one pair at a time. A pile can have tokens remaining only after you have exhausted the other pile. The counter records paired tokens and does not include any leftovers.",
  "## Why this works / conditions",
  "Assume the inputs are nonnegative integers. At every iteration both piles lose one token and the counter increases by one. The same invariant holds after every step, so the output is the smaller input. A debug trace tests the boundary when either input is zero.",
  "## Procedure",
  "Start the counter at zero, check whether both piles have a token, remove one from each, increment the counter and repeat the test.",
  "### Original worked example",
  ":::exercise Pair the tokens",
  "Trace the first three decisions for piles of four and seven tokens.",
  ":::answer",
  "First the counter reaches one and the piles hold three and six tokens. Next it reaches two with two and five left. Then it reaches three with one and four left.",
  ":::end",
  "## Assessment",
  "### Recognition",
  ":::exercise Recognise the contract",
  "Can the algorithm accept a pile of negative size?",
  ":::answer",
  "The contract requires nonnegative integers.",
  ":::end",
  "### Procedure",
  ":::exercise Trace the loop",
  "Trace the counter for piles of two and five.",
  ":::answer",
  "It reaches two after the second iteration, and the left pile is exhausted.",
  ":::end",
  "### Error correction",
  ":::exercise Debug termination",
  "A trace stops only when both piles are empty. Explain the bug.",
  ":::answer",
  "The loop condition must require a token in both piles. With one empty pile, the next iteration would break the input contract.",
  ":::end",
  "### Transfer",
  ":::exercise Handle the boundary",
  "Adapt the check to pair three piles.",
  ":::answer",
  "Require all three piles to be nonempty before an iteration, then remove one from each pile.",
  ":::end",
  "## Pause and Predict",
  ":::exercise Predict the first decision",
  "Which loop decision changes first when the left pile starts empty?",
  ":::answer",
  "The first check fails, so the counter stays at zero.",
  ":::end",
].join("\n");

async function verify() {
  await prisma.$transaction(
    async (tx) => {
      const suffix = randomUUID();
      const qualification = (code: string) =>
        tx.qualification.create({
          data: {
            institution: "UNISA",
            code,
            stream: suffix,
            title: "Rolled-back verification",
            streamTitle: "Classroom QA",
            saqaId: "verification",
            nqfExitLevel: 7,
          },
        });
      const q = await qualification("QA-TEACHING");
      const other = await qualification("QA-OTHER");
      const scope = { qualificationId: q.id };
      await transactionLock(tx, "vela:qualification:" + q.id);
      const reviewer = suffix + "-admin";
      const instructor = suffix + "-instructor";
      const learner = suffix + "-learner";
      const peer = suffix + "-peer";
      for (const [studentId, role] of [
        [reviewer, "admin"],
        [instructor, "staff"],
      ] as const) {
        await tx.studentProfile.create({ data: { studentId } });
        await tx.staffMembership.create({ data: { studentId, ...scope, role } });
      }
      assert.equal(await teachingRole(tx, instructor, q.id), "staff");
      await assert.rejects(teachingRole(tx, instructor, q.id, true), { status: 403 });
      await assert.rejects(teachingRole(tx, reviewer, other.id), { status: 403 });
      await assert.rejects(
        adminCommand(tx, reviewer, {
          ...scope,
          action: "membership",
          studentId: reviewer,
          role: "remove",
        }),
        { status: 409 },
      );
      console.log(
        "PASS qualification isolation, instructor/admin separation and last-admin protection",
      );

      const module = await tx.module.upsert({
        where: { institution_code: { institution: "UNISA", code: "COS1511" } },
        create: { institution: "UNISA", code: "COS1511", title: "Classroom QA" },
        update: {},
      });
      const moduleScope = { ...scope, moduleId: module.id };
      await tx.qualificationModule.create({ data: { ...moduleScope, studyYear: 1, position: 1 } });
      await adminCommand(tx, reviewer, {
        ...scope,
        action: "settings",
        displayName: "Classroom QA",
        supportEmail: "qa@example.invalid",
        allowSelfEnrollment: false,
      });
      await adminCommand(tx, reviewer, {
        ...moduleScope,
        action: "moduleAccess",
        acceptingEnrollments: false,
      });

      const { inviteToken } = await adminCommand(tx, reviewer, {
        ...moduleScope,
        action: "invite",
        email: "learner@example.invalid",
        role: "student",
      });
      assert.ok(inviteToken);
      const identity = { id: learner, email: "Learner@example.invalid", emailVerified: true };
      await assert.rejects(claimInvite(tx, { ...identity, emailVerified: false }, inviteToken), {
        status: 403,
      });
      await assert.rejects(
        claimInvite(tx, { ...identity, email: "peer@example.invalid" }, inviteToken),
        { status: 404 },
      );
      await claimInvite(tx, identity, inviteToken);
      await assert.rejects(claimInvite(tx, identity, inviteToken), { status: 409 });
      const enrollment = await tx.enrollment.findFirstOrThrow({
        where: { ...moduleScope, studentId: learner },
      });
      assert.equal(enrollment.status, "active");
      console.log(
        "PASS verified-email invitation, qualification enrolment and single-use protection",
      );

      const cohort = await classroomCommand(tx, instructor, {
        ...scope,
        action: "createCohort",
        name: "Classroom QA",
      });
      await classroomCommand(tx, instructor, {
        ...scope,
        action: "cohortMember",
        cohortId: cohort.id,
        studentId: learner,
        member: true,
      });
      await tx.enrollment.create({ data: { ...moduleScope, studentId: peer } });
      const assignment = await classroomCommand(tx, instructor, {
        ...moduleScope,
        action: "createAssignment",
        cohortId: cohort.id,
        title: "Loop boundary",
        instructions: "Explain the loop invariant.",
        dueAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        rubric: [{ label: "Justification", max: 5 }],
      });
      await assert.rejects(
        submitAssignment(tx, peer, { assignmentId: assignment.id, body: "Not a cohort member." }),
        { status: 403 },
      );
      const submission = {
        assignmentId: assignment.id,
        body: "Each iteration removes a token from both piles.",
      };
      const { submittedAt } = await submitAssignment(tx, learner, submission);
      assert.deepEqual((await submitAssignment(tx, learner, submission)).submittedAt, submittedAt);
      const grade = {
        ...scope,
        action: "grade" as const,
        assignmentId: assignment.id,
        studentId: learner,
        expectedSubmittedAt: submittedAt.toISOString(),
        feedback: "Explain what happens when one pile is empty.",
      };
      await assert.rejects(classroomCommand(tx, instructor, { ...grade, scores: [6] }), {
        status: 422,
      });
      await classroomCommand(tx, instructor, { ...grade, scores: [4] });
      await assert.rejects(
        submitAssignment(tx, learner, { ...submission, body: "A late revision." }),
        { status: 409 },
      );
      const saved = await tx.teachingSubmission.findFirstOrThrow({
        where: { assignmentId: assignment.id, studentId: learner },
      });
      assert.deepEqual(saved.scores, [4]);
      assert.equal(saved.feedback, grade.feedback);
      const notice = await classroomCommand(tx, instructor, {
        ...scope,
        action: "announce",
        cohortId: cohort.id,
        title: "Office hour",
        body: "Bring your trace to the next lesson.",
      });
      assert.equal(
        await tx.teachingAnnouncement.count({
          where: { id: notice.id, cohort: { members: { some: { studentId: learner } } } },
        }),
        1,
      );
      await adminCommand(tx, reviewer, {
        ...scope,
        action: "enrollmentStatus",
        enrollmentId: enrollment.id,
        status: "withdrawn",
      });
      await assert.rejects(submitAssignment(tx, learner, submission), { status: 403 });
      console.log(
        "PASS cohort restrictions, assignment submission, rubric validation, feedback and access withdrawal",
      );

      const unit = await tx.studyUnit.create({
        data: { moduleId: module.id, code: suffix, title: "Bounded loops", position: 98765 },
      });
      const criterion = await tx.assessmentCriterion.create({
        data: {
          ...scope,
          code: "QA-CRITERION",
          description: "Trace bounded loops",
          sourceUrl: "https://example.invalid/curriculum",
        },
      });
      const outcome = await tx.learningOutcome.create({
        data: {
          studyUnitId: unit.id,
          code: "TRACE",
          description: "Trace bounded loops",
          position: 1,
          assessmentCriteria: { connect: { id: criterion.id } },
        },
      });
      // A pre-existing shared module requires authority in every qualification.
      const links = await tx.qualificationModule.findMany({
        where: { moduleId: module.id, qualificationId: { not: q.id } },
      });
      for (const link of links)
        await tx.staffMembership.create({
          data: { studentId: reviewer, qualificationId: link.qualificationId, role: "admin" },
        });

      async function submit(markdown: string, sessionId?: string, baseVersion?: number) {
        const draft = await saveLesson(tx, instructor, {
          ...scope,
          action: "saveLesson",
          studyUnitId: unit.id,
          title: "Trace paired tokens",
          markdown,
          sessionId,
          baseVersion,
        });
        const updated = await tx.lessonDraft.findUniqueOrThrow({ where: { id: draft.id } });
        await submitLesson(tx, instructor, {
          ...scope,
          action: "submitLesson",
          draftId: draft.id,
          expectedUpdatedAt: updated.updatedAt.toISOString(),
        });
        return {
          ...scope,
          action: "reviewLesson" as const,
          draftId: draft.id,
          decision: "publish" as const,
          note: "Verification fixture review.",
        };
      }
      const candidate = await submit(lesson);
      assert.equal(await tx.studySession.count({ where: { studyUnitId: unit.id } }), 0);
      await assert.rejects(reviewLesson(tx, instructor, candidate), { status: 403 });
      await assert.rejects(
        reviewLesson(tx, reviewer, candidate, async () => {
          throw Error("fixture embedding unavailable");
        }),
        /fixture embedding unavailable/,
      );
      assert.equal(await tx.studySession.count({ where: { studyUnitId: unit.id } }), 0);
      const dimensions = getAIConfig().embeddingSpace.dimensions;
      const embed = async (chunks: number[][]) =>
        chunks.map(() => Array.from({ length: dimensions }, (_, i) => (i === 0 ? 1 : 0)));
      const release = await reviewLesson(tx, reviewer, candidate, embed);
      assert.ok(release);
      assert.equal(release.version, 1);
      assert.ok(
        await tx.contentChunk.count({
          where: {
            learningOutcomeId: outcome.id,
            resourceUrl: "/study/" + unit.id + "/sessions/" + release.sessionId,
          },
        }),
      );
      const revision = await submit(
        lesson.replace("counting tokens", "matching tokens"),
        release.sessionId,
        1,
      );
      const published = await reviewLesson(tx, reviewer, revision, embed);
      assert.deepEqual(published, { sessionId: release.sessionId, version: 2 });
      const history = await tx.lessonDraft.findUniqueOrThrow({ where: { id: revision.draftId } });
      assert.equal((history.previous as { version: number }).version, 1);
      assert.equal(await tx.ingestion.count({ where: { learningOutcomeId: outcome.id } }), 1);
      assert.equal(
        await tx.teachingAudit.count({ where: { ...scope, action: "publishLesson" } }),
        2,
      );
      console.log(
        "PASS second-reviewer publishing, failed-embedding safety, pgvector indexing, version snapshots and audit history",
      );
      throw rollback;
    },
    { maxWait: 25_000, timeout: 120_000 },
  );
}

verify()
  .catch((error) => {
    if (error !== rollback) throw error;
    console.log("PASS staging fixture rolled back");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

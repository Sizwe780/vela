import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { startConceptAttempt, submitConceptAttempt } from "../lib/coach/teach-service";
import type { coachJSON } from "../lib/coach/ai";
import { coachContext } from "../lib/coach/context";
async function main() {
  const studentId = "coach-qa-" + randomUUID();
  try {
    const session = await prisma.studySession.findFirstOrThrow({
      where: { studyUnit: { code: "MAT1503-U1" } },
      include: { studyUnit: { include: { module: { include: { qualifications: { take: 1 } } } } } },
    });
    const moduleId = session.studyUnit.moduleId,
      qualificationId = session.studyUnit.module.qualifications[0].qualificationId;
    await assert.rejects(
      startConceptAttempt(studentId, session.studyUnitId, session.id),
      (e: any) => e.status === 403,
    );
    await prisma.enrollment.create({ data: { studentId, moduleId, qualificationId } });
    const context = await coachContext(studentId, session.studyUnitId, session.id);
    const explanation =
      "A linear system uses only first powers. Multiplying unknowns would change the problem into a nonlinear system. A reversible row operation preserves exactly the same solutions.";
    let calls = 0;
    let entered!: () => void, release!: () => void;
    const enteredReview = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const releaseReview = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reviewer: typeof coachJSON = async (schema) => {
      calls++;
      if (calls === 1) {
        entered();
        await releaseReview;
      }
      return schema.parse({
        supported: true,
        confidence: "high",
        facets: ["correctness", "reasoning", "clarity", "example"].map((id) => ({
          id,
          score: 1,
          learnerQuote: explanation.slice(0, 38),
          referenceQuote: context.reference.slice(0, 38),
          feedback: "Explain the condition with your own example.",
        })),
        misconceptions: [],
        nextQuestion: "Why must each row operation be reversible?",
        summary: "Test fixture: supported conceptual feedback.",
      });
    };
    const attempt = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    await assert.rejects(
      submitConceptAttempt("other-" + studentId, attempt.id, explanation, undefined, reviewer),
      (e: any) => e.status === 404,
    );
    const first = submitConceptAttempt(studentId, attempt.id, explanation, undefined, reviewer);
    await enteredReview;
    try {
      await assert.rejects(
        submitConceptAttempt(studentId, attempt.id, explanation, undefined, reviewer),
        (e: any) => e.status === 409,
      );
    } finally {
      release();
    }
    const result = await first;
    assert.equal(result.pointsEarned, 10);
    assert.equal(result.masteryUpdated, true);
    assert.equal(calls, 1);
    const replay = await submitConceptAttempt(
      studentId,
      attempt.id,
      explanation,
      undefined,
      reviewer,
    );
    assert.deepEqual(replay, result);
    assert.equal(calls, 1);
    await assert.rejects(
      submitConceptAttempt(
        studentId,
        attempt.id,
        explanation + " Different draft.",
        undefined,
        reviewer,
      ),
      (e: any) => e.status === 409,
    );
    const second = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    const same = await submitConceptAttempt(studentId, second.id, explanation, undefined, reviewer);
    assert.equal(same.pointsEarned, 0);
    assert.equal(same.bestPoints, 10);
    const master = await prisma.studentMastery.findUniqueOrThrow({
      where: { studentId_learningOutcomeId: { studentId, learningOutcomeId: context.outcome.id } },
    });
    assert.equal(master.attempts, 2);
    assert.equal(master.score, 1);
    const stale = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    await prisma.conceptAttempt.update({
      where: { id: stale.id },
      data: { contentHash: "stale-fixture" },
    });
    await assert.rejects(
      submitConceptAttempt(studentId, stale.id, explanation, undefined, reviewer),
      (e: any) => e.code === "SESSION_CHANGED",
    );
    const uncertain = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    const uncertainReview: typeof coachJSON = async (schema, messages, options) => {
      const g: any = await reviewer(schema, messages, options);
      g.confidence = "low";
      return g;
    };
    const noCredit = await submitConceptAttempt(
      studentId,
      uncertain.id,
      explanation,
      undefined,
      uncertainReview,
    );
    assert.equal(noCredit.masteryUpdated, false);
    assert.equal(noCredit.pointsEarned, 0);
    assert.equal(
      (await prisma.studentMastery.findUniqueOrThrow({ where: { id: master.id } })).attempts,
      2,
    );
    const withdrawn = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    const withdrawDuringReview: typeof coachJSON = async (schema, messages, options) => {
      const g = await reviewer(schema, messages, options);
      await prisma.enrollment.updateMany({ where: { studentId }, data: { status: "withdrawn" } });
      return g;
    };
    await assert.rejects(
      submitConceptAttempt(studentId, withdrawn.id, explanation, undefined, withdrawDuringReview),
      (e: any) => e.status === 403,
    );
    assert.equal(
      (await prisma.studentMastery.findUniqueOrThrow({ where: { id: master.id } })).attempts,
      2,
    );
    console.log(
      "PASS: conceptual points are owner-scoped, transactional, capped, replay-safe, concurrent-safe, source-version checked, uncertainty-safe and recheck enrollment. No real student's records or lesson text were changed. Grading was a deterministic test double.",
    );
  } finally {
    await prisma.conceptAttempt.deleteMany({ where: { studentId } });
    await prisma.studentMastery.deleteMany({ where: { studentId } });
    await prisma.enrollment.deleteMany({ where: { studentId } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

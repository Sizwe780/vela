import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { startConceptAttempt, submitConceptAttempt } from "../lib/coach/teach-service";
async function main() {
  const studentId = "coach-live-qa-" + randomUUID();
  try {
    const session = await prisma.studySession.findFirstOrThrow({
      where: { studyUnit: { code: "MAT1503-U1" } },
      orderBy: { position: "asc" },
      include: { studyUnit: { include: { module: { include: { qualifications: { take: 1 } } } } } },
    });
    await prisma.enrollment.create({
      data: {
        studentId,
        moduleId: session.studyUnit.moduleId,
        qualificationId: session.studyUnit.module.qualifications[0].qualificationId,
      },
    });
    const challenge = await startConceptAttempt(studentId, session.studyUnitId, session.id);
    const explanation =
      "A system is linear when every unknown appears only to the first power and unknowns are not multiplied together. Think of ingredients at fixed prices: doubling an unknown amount doubles its contribution while fixed constants stay fixed. For example, 2x + 3y = 7 and x - y = 1 are linear equations. The expression xy = 7 is not linear because one unknown becomes the other unknown's changing coefficient. Linearity concerns the unknowns; a known coefficient may be negative or zero. We identify the unknowns before deciding which coefficients are fixed.";
    const result = await submitConceptAttempt(studentId, challenge.id, explanation);
    console.log(
      JSON.stringify({
        test: "Live Cloudflare conceptual grading of a synthetic learner explanation",
        session: session.title,
        result,
      }),
    );
    assert.equal(
      result.masteryUpdated,
      true,
      "Live grade must pass the unchanged source/learner evidence checks",
    );
    assert.ok(result.pointsEarned > 0);
  } finally {
    await prisma.conceptAttempt.deleteMany({ where: { studentId } });
    await prisma.studentMastery.deleteMany({ where: { studentId } });
    await prisma.enrollment.deleteMany({ where: { studentId } });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Live coach test failed");
  process.exitCode = 1;
});

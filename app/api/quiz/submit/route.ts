import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError, publicError } from "../../../../lib/ingest/errors";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { quizEngine } from "../../../../lib/quiz/runtime";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const input = await readJson(request);
    if (
      !input ||
      typeof input !== "object" ||
      !("attemptId" in input) ||
      typeof input.attemptId !== "string"
    )
      throw new IngestError(400, "INVALID_ATTEMPT", "Choose a quiz attempt.");
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: input.attemptId, studentId: learner.id },
      select: { studyUnitId: true },
    });
    if (!attempt)
      throw new IngestError(404, "ATTEMPT_NOT_FOUND", "Quiz attempt not found for your account.");
    await requireUnitAccess(learner.id, attempt.studyUnitId);
    return Response.json(await quizEngine.submit(learner.id, input), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (!(error instanceof IngestError))
      console.warn(
        "Quiz submission database failure:",
        error instanceof Error ? error.name : "UnknownError",
        error && typeof error === "object" && "code" in error ? String(error.code) : "no-code",
      );
    const failure = publicError(
      error instanceof IngestError
        ? error
        : new IngestError(
            503,
            "QUIZ_UNAVAILABLE",
            "Your quiz could not be saved. Retry the same submission safely.",
          ),
    );
    return Response.json(
      { error: failure.error },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

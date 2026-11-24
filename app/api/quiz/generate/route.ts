import { requireUnitAccess } from "../../../../lib/enrollment/access";
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
      !("studyUnitId" in input) ||
      typeof input.studyUnitId !== "string"
    )
      throw new IngestError(400, "INVALID_UNIT", "Choose a study unit.");
    await requireUnitAccess(learner.id, input.studyUnitId);
    return Response.json(await quizEngine.generate(learner.id, input, request.signal), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const failure = publicError(
      error instanceof IngestError
        ? error
        : new IngestError(
            503,
            "QUIZ_UNAVAILABLE",
            "Practice is temporarily unavailable. Please retry.",
          ),
    );
    return Response.json(
      { error: failure.error },
      { status: failure.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

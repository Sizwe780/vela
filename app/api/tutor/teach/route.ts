import { requireLearner } from "../../../../lib/auth/server";
import { prisma } from "../../../../lib/db";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { publicError, IngestError } from "../../../../lib/ingest/errors";
import { coachInput } from "../../../../lib/coach/input";
import { teachInput } from "../../../../lib/coach/types";
import { startConceptAttempt, submitConceptAttempt } from "../../../../lib/coach/teach-service";
import { logServerError } from "../../../../lib/log-error";
export const runtime = "nodejs";
export const maxDuration = 90;
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const input = coachInput(teachInput, await readJson(request));
    return Response.json(
      input.action === "start"
        ? await startConceptAttempt(learner.id, input.studyUnitId, input.sessionId)
        : await submitConceptAttempt(
            learner.id,
            input.attemptId,
            input.explanation,
            request.signal,
          ),
      { headers },
    );
  } catch (e) {
    if (!(e instanceof IngestError) && !request.signal.aborted)
      logServerError("coach.teach.submit", e);
    const f = publicError(
      e instanceof IngestError
        ? e
        : new IngestError(
            503,
            "TEACH_UNAVAILABLE",
            "Your explanation could not be checked. Keep it and retry; no points were awarded.",
          ),
    );
    return Response.json({ error: f.error }, { status: f.status, headers });
  }
}
export async function GET() {
  try {
    const learner = await requireLearner();
    const rows = await prisma.conceptAttempt.groupBy({
      by: ["learningOutcomeId"],
      where: { studentId: learner.id, verified: true },
      _max: { score: true },
    });
    return Response.json(
      {
        studentId: learner.id,
        points: rows.reduce((s, r) => s + Math.round((r._max.score ?? 0) * 10), 0),
        outcomes: rows.length,
      },
      { headers },
    );
  } catch (e) {
    if (!(e instanceof IngestError)) logServerError("coach.teach.summary", e);
    const f = publicError(
      e instanceof IngestError
        ? e
        : new IngestError(
            503,
            "TEACH_UNAVAILABLE",
            "Conceptual progress is temporarily unavailable.",
          ),
    );
    return Response.json({ error: f.error }, { status: f.status, headers });
  }
}

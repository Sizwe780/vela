import { requireLearner } from "../../../../lib/auth/server";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError, publicError } from "../../../../lib/ingest/errors";
import { coachJSON } from "../../../../lib/coach/ai";
import { coachContext, evidencePolicy, limitCoach } from "../../../../lib/coach/context";
import { coachInput } from "../../../../lib/coach/input";
import { diagnosisInput, diagnosisSchema } from "../../../../lib/coach/types";
import { checkWorkingOnServer } from "../../../../lib/coach/server-cas";
import { groundDiagnosis } from "../../../../lib/coach/diagnosis";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const input = coachInput(diagnosisInput, await readJson(request));
    const context = await coachContext(learner.id, input.studyUnitId, input.sessionId);
    limitCoach(learner.id);
    const serverChecks = await checkWorkingOnServer(
      input.steps.map((s) => ({ ...s, uncertain: false })),
      request.signal,
    );
    const result = await coachJSON(
      diagnosisSchema,
      [
        {
          role: "system",
          content: `${evidencePolicy} Diagnose the student's CONFIRMED transcription against the session. Treat 'consistent' as a provisional AI judgement, not a formal CAS proof. Name the first specific sign, coefficient or reasoning error by step number; do not invent errors. Ask for clarification if notation is ambiguous. Give short Socratic repair hints instead of completing the entire solution. Return {"summary":"...","steps":[{"number":1,"status":"consistent|revisit|uncertain","feedback":"...","hint":"..."}],"nextQuestion":"one question"}. Return exactly one feedback item for every submitted step, preserving numbering. SESSION DATA:\n${context.reference}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            question: input.question,
            confirmedSteps: input.steps,
            serverAlgebraChecks: serverChecks,
          }),
        },
      ],
      { signal: request.signal },
    );
    if (
      result.steps.length !== input.steps.length ||
      result.steps.some((s, i) => s.number !== input.steps[i].number)
    )
      throw new IngestError(
        503,
        "DIAGNOSIS_INCOMPLETE",
        "The tutor missed a step. Your transcription is preserved; please retry.",
      );
    return Response.json(
      {
        ...groundDiagnosis(result, input.steps, serverChecks),
        serverChecks,
        provisional: true,
        masteryUpdated: false,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const f = publicError(
      e instanceof IngestError
        ? e
        : new IngestError(
            503,
            "DIAGNOSIS_UNAVAILABLE",
            "Diagnosis is unavailable. Keep your working and try again.",
          ),
    );
    return Response.json(
      { error: f.error },
      { status: f.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

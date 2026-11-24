import { requireLearner } from "../../../../lib/auth/server";
import { requireModuleAccess } from "../../../../lib/enrollment/access";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
import { learnerContextPreview } from "../../../../lib/learning/view";
import { IngestError } from "../../../../lib/ingest/errors";
export async function GET(request: Request) {
  try {
    const learner = await requireLearner(),
      moduleId = new URL(request.url).searchParams.get("moduleId");
    if (!moduleId || !/^[a-zA-Z0-9_-]{1,100}$/.test(moduleId))
      throw new IngestError(400, "INVALID_MODULE", "Choose a module for the context preview.");
    await requireModuleAccess(learner.id, moduleId);
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (sessionId && !/^[a-zA-Z0-9_-]{1,100}$/.test(sessionId))
      throw new IngestError(400, "INVALID_SESSION", "Choose a valid session.");
    const { data, ...preview } = await learnerContextPreview(
      learner.id,
      moduleId,
      sessionId ?? undefined,
    );
    return Response.json({ ownerId: learner.id, ...preview }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

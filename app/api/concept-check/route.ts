import { z } from "zod";
import { requireLearner } from "../../../lib/auth/server";
import { requireModuleAccess } from "../../../lib/enrollment/access";
import { prisma } from "../../../lib/db";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { IngestError } from "../../../lib/ingest/errors";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { learningView } from "../../../lib/learning/view";
import { conceptGraph } from "../../../lib/learning/graph";
import { createConceptEngine } from "../../../lib/learning/engine";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("issue"),
      ownerId: id,
      moduleId: id,
      conceptId: z.string().regex(/^[a-z][a-z0-9.-]{1,80}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("submit"),
      ownerId: id,
      checkId: z.string().uuid(),
      choice: z.enum(["a", "b", "c", "d"]),
    })
    .strict(),
]);
const engine = createConceptEngine({
  query: (s) => prisma.$queryRaw(s),
  transaction: (fn) =>
    prisma.$transaction((tx) => fn({ query: (s) => tx.$queryRaw(s) }), {
      maxWait: 10000,
      timeout: 20000,
    }),
});
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner(),
      parsed = input.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_CONCEPT_CHECK",
        "Choose a registered concept and submit only its issued option.",
      );
    const data = parsed.data;
    if (data.ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Reload before checking.",
      );
    if (data.action === "submit")
      return Response.json(await engine.submit(learner.id, data.checkId, data.choice), {
        headers: privateHeaders,
      });
    await requireModuleAccess(learner.id, data.moduleId);
    const view = await learningView(learner.id, data.moduleId),
      entry = view.concepts.find((n) => n.id === data.conceptId),
      node = conceptGraph.nodes.find((n) => n.id === data.conceptId);
    if (!entry || !node)
      throw new IngestError(
        404,
        "CONCEPT_UNAVAILABLE",
        "This concept has no published mapping in your current module.",
      );
    return Response.json(
      await engine.issue(learner.id, node, data.moduleId, entry.mappings[0].unitId),
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}

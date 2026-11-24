import { z } from "zod";
import { requireLearner } from "../../../lib/auth/server";
import { requireModuleAccess } from "../../../lib/enrollment/access";
import { prisma } from "../../../lib/db";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { IngestError } from "../../../lib/ingest/errors";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { learningView } from "../../../lib/learning/view";
import { availabilitySchema } from "../../../lib/learning/schedule";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const preferences = z
  .object({
    ownerId: id,
    tutorContext: z.boolean(),
    crossModule: z.boolean(),
    availability: availabilitySchema,
  })
  .strict()
  .refine(
    (p) => !p.crossModule || p.tutorContext,
    "Enable tutor context before cross-module context.",
  );
export async function GET(request: Request) {
  try {
    const learner = await requireLearner(),
      moduleId = new URL(request.url).searchParams.get("moduleId");
    if (moduleId) {
      if (!id.safeParse(moduleId).success)
        throw new IngestError(400, "INVALID_MODULE", "Choose a valid module.");
      await requireModuleAccess(learner.id, moduleId);
    }
    return Response.json(await learningView(learner.id, moduleId ?? undefined), {
      headers: privateHeaders,
    });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function PUT(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner(),
      parsed = preferences.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_LEARNING_PREFERENCES",
        "Check your context controls and up to 14 non-overlapping availability periods.",
      );
    const { ownerId, ...input } = parsed.data;
    if (ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Reload these preferences.",
      );
    const now = Date.now();
    if (
      input.availability.some(
        (s) => Date.parse(s.startAt) < now || Date.parse(s.startAt) > now + 30 * 86400000,
      )
    )
      throw new IngestError(
        400,
        "INVALID_AVAILABILITY",
        "Choose future availability within the next 30 days.",
      );
    await prisma.learningPreference.upsert({
      where: { studentId: learner.id },
      create: { studentId: learner.id, ...input },
      update: input,
    });
    return Response.json({ saved: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner(),
      parsed = z
        .object({ ownerId: id })
        .strict()
        .safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(400, "INVALID_RESET", "Confirm which account to reset.");
    if (parsed.data.ownerId !== learner.id)
      throw new IngestError(
        409,
        "ACCOUNT_CHANGED",
        "Your account changed. Reload before resetting.",
      );
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${"concept:" + learner.id},0))) gate`;
      await tx.learningConceptState.deleteMany({ where: { studentId: learner.id } });
      await tx.conceptCheck.deleteMany({ where: { studentId: learner.id } });
    });
    return Response.json({ reset: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

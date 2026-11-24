import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
import { enqueueWelcome } from "../../../../lib/email/service";
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    await enqueueWelcome(prisma, user.id);
    return Response.json({ queued: true }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

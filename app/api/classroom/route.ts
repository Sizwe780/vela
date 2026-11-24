import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { IngestError } from "../../../lib/ingest/errors";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { learnerClassroom } from "../../../lib/teaching/read";
import { learnerCommandSchema } from "../../../lib/teaching/input";
import { submitAssignment } from "../../../lib/teaching/classroom";
import { claimInvite } from "../../../lib/teaching/admin";

export async function GET() {
  try {
    const user = await requireLearner();
    return Response.json(await learnerClassroom(user.id), { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = learnerCommandSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_CLASSROOM_COMMAND",
        "Check the invitation or assignment fields.",
      );
    const input = parsed.data;
    const result = await prisma.$transaction(
      async (tx) =>
        input.action === "submit"
          ? submitAssignment(tx, user.id, input)
          : claimInvite(
              tx,
              { id: user.id, email: user.email, emailVerified: !!user.emailVerified },
              input.token,
            ),
      { maxWait: 10_000, timeout: 20_000 },
    );
    return Response.json({ ok: true, ...result }, { headers: privateHeaders });
  } catch (e) {
    return studentFailure(e);
  }
}

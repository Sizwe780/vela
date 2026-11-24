import { randomUUID } from "node:crypto";
import { prisma } from "../../../../lib/db";
import { requireLearner } from "../../../../lib/auth/server";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { emailConfig, recallDay } from "../../../../lib/email/config";
import { IngestError } from "../../../../lib/ingest/errors";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const config = emailConfig();
    if (!user.emailVerified || !config || user.email.toLowerCase() !== config.testRecipient)
      throw new IngestError(
        403,
        "TEST_NOT_ALLOWED",
        "Delivery tests are limited to the configured, verified test account.",
      );
    await prisma.emailDelivery.createMany({
      data: [
        {
          id: randomUUID(),
          studentId: user.id,
          kind: "test",
          dedupeKey: `test:${user.id}:${recallDay(new Date())}`,
        },
      ],
      skipDuplicates: true,
    });
    return Response.json(
      { queued: true, message: "Delivery test queued. Only one test per day is sent." },
      { headers: privateHeaders },
    );
  } catch (e) {
    return studentFailure(e);
  }
}

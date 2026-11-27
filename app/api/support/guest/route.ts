import { prisma } from "../../../../lib/db";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { readJson } from "../../../../lib/ingest/http";
import { IngestError } from "../../../../lib/ingest/errors";
import { guestSupportInput, createGuestSupport } from "../../../../lib/account/guest-support";
import { privateHeaders, studentFailure } from "../../../../lib/student/http";
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const input = guestSupportInput.safeParse(await readJson(request, 12000));
    if (!input.success)
      throw new IngestError(
        400,
        "INVALID_CONTACT",
        "Enter your reply email, a subject and a message of 20–3,000 characters. Leave out passwords and verification codes.",
      );
    const receipt = await prisma.$transaction((tx) => createGuestSupport(tx, input.data), {
      maxWait: 5000,
      timeout: 12000,
    });
    return Response.json({ reference: receipt.id }, { status: 201, headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}

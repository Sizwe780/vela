import { requireLearner } from "../../../lib/auth/server";
import { prisma } from "../../../lib/db";
import { IngestError } from "../../../lib/ingest/errors";
import { readJson } from "../../../lib/ingest/http";
import { assertTutorOrigin } from "../../../lib/tutor/origin";
import { privateHeaders, studentFailure } from "../../../lib/student/http";
import { deletionDeadline } from "../../../lib/account/retention-policy";
import { supportInput } from "../../../lib/account/input";
import { isSupportOperator, supportCommand } from "../../../lib/account/support";

export async function GET(request: Request) {
  try {
    const user = await requireLearner();
    const inbox = new URL(request.url).searchParams.get("view") === "inbox";
    const operator = await isSupportOperator(prisma, user);
    if (inbox && !operator)
      throw new IngestError(403, "SUPPORT_REQUIRED", "You can access your own requests from Help.");
    const requests = await prisma.supportRequest.findMany({
      where: inbox ? { status: { in: ["open", "in_review"] } } : { studentId: user.id },
      select: {
        id: true,
        category: true,
        subject: true,
        body: true,
        status: true,
        response: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return Response.json(
      {
        ownerId: user.id,
        operator,
        requests: requests.map((item) => ({
          ...item,
          deletionTarget:
            item.category === "deletion" ? deletionDeadline(item.createdAt).toISOString() : null,
        })),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return studentFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const user = await requireLearner();
    const parsed = supportInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new IngestError(
        400,
        "INVALID_SUPPORT_REQUEST",
        "Check the report fields or confirmation phrase.",
      );
    const result = await prisma.$transaction((tx) => supportCommand(tx, user, parsed.data), {
      maxWait: 10000,
      timeout: 15000,
    });
    return Response.json(result, { headers: privateHeaders });
  } catch (error) {
    return studentFailure(error);
  }
}

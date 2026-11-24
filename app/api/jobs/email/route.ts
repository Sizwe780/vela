import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../../../lib/db";
import { runEmailBatch } from "../../../../lib/email/service";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  const expected = process.env.EMAIL_JOB_SECRET ?? "";
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const actualBytes = Buffer.from(actual),
    expectedBytes = Buffer.from(expected);
  if (
    expected.length < 32 ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  )
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(await runEmailBatch(prisma), { headers: { "Cache-Control": "no-store" } });
}

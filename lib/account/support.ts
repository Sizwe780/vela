import { IngestError } from "../ingest/errors";
import { transactionLock, type Tx } from "../teaching/scope";
import type { z } from "zod";
import type { supportInput } from "./input";

type Actor = { id: string; emailVerified: boolean };
type Command = z.infer<typeof supportInput>;
export async function isSupportOperator(tx: Tx, user: Actor) {
  return !!(
    user.emailVerified &&
    process.env.VELA_SUPPORT_OPERATOR_ID === user.id &&
    (await tx.staffMembership.findFirst({
      where: { studentId: user.id, role: "admin" },
      select: { studentId: true },
    }))
  );
}
export async function supportCommand(tx: Tx, actor: Actor, input: Command) {
  await transactionLock(tx, "vela:account:" + actor.id);
  const owned = { studentId: actor.id };
  if (input.action === "respond") {
    if (!(await isSupportOperator(tx, actor)))
      throw new IngestError(403, "SUPPORT_REQUIRED", "This action requires support staff access.");
    const changed = await tx.supportRequest.updateMany({
      where: {
        id: input.id,
        status: { in: ["open", "in_review"] },
        ...(input.status === "resolved" ? { category: { not: "deletion" } } : {}),
      },
      data: { status: input.status, response: input.response },
    });
    if (!changed.count)
      throw new IngestError(
        409,
        "REQUEST_CHANGED",
        "This request is closed or needs operator fulfilment.",
      );
    return { id: input.id };
  }
  if (input.action === "cancelDeletion") {
    const changed = await tx.supportRequest.updateMany({
      where: { ...owned, id: input.id, category: "deletion", status: "open" },
      data: { status: "cancelled" },
    });
    if (!changed.count)
      throw new IngestError(
        409,
        "REQUEST_CHANGED",
        "This request can no longer be cancelled here. Contact support.",
      );
    return { id: input.id };
  }
  if (input.action === "deletion") {
    if (!actor.emailVerified)
      throw new IngestError(
        403,
        "EMAIL_UNVERIFIED",
        "Verify your sign-in email before requesting deletion.",
      );
    const current = await tx.supportRequest.findFirst({
      where: { ...owned, category: "deletion", status: { in: ["open", "in_review"] } },
      select: { id: true },
    });
    if (current) return current;
    return tx.supportRequest.create({
      data: {
        ...owned,
        category: "deletion",
        subject: "Account deletion request",
        body: "Requested by the signed-in account after explicit confirmation.",
      },
      select: { id: true },
    });
  }
  const recent = await tx.supportRequest.count({
    where: {
      ...owned,
      category: { not: "deletion" },
      createdAt: { gte: new Date(Date.now() - 86_400_000) },
    },
  });
  if (recent >= 5)
    throw new IngestError(
      429,
      "SUPPORT_LIMIT",
      "You can submit five issue reports per day. Your existing reports are below.",
    );
  return tx.supportRequest.create({
    data: { ...owned, category: input.category, subject: input.subject, body: input.body },
    select: { id: true },
  });
}

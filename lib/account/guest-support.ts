import { z } from "zod";
import { IngestError } from "../ingest/errors";
import { transactionLock, type Tx } from "../teaching/scope";
export const guestSupportInput = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    topic: z.enum(["account", "privacy", "accessibility", "technical"]),
    subject: z.string().trim().min(5).max(140),
    message: z.string().trim().min(20).max(3000),
    website: z.literal("").default(""),
  })
  .strict();
export async function createGuestSupport(
  tx: Tx,
  value: z.infer<typeof guestSupportInput>,
  now = new Date(),
) {
  await transactionLock(tx, "vela:guest-support");
  const since = new Date(now.getTime() - 86400000);
  const contact = `Reply address: ${value.email}\n`;
  const [total, individual] = await Promise.all([
    tx.supportRequest.count({ where: { studentId: null, createdAt: { gte: since } } }),
    tx.supportRequest.count({
      where: { studentId: null, createdAt: { gte: since }, body: { startsWith: contact } },
    }),
  ]);
  if (total >= 100 || individual >= 5)
    throw new IngestError(
      429,
      "CONTACT_LIMIT",
      "We cannot accept another request right now. Please try again later.",
    );
  return tx.supportRequest.create({
    data: {
      studentId: null,
      category: value.topic === "privacy" ? "account" : value.topic,
      subject: `${value.topic === "privacy" ? "Privacy request" : "Contact"}: ${value.subject}`,
      body: `${contact}Topic: ${value.topic}\n\n${value.message}`,
    },
    select: { id: true },
  });
}

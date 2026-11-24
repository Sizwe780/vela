import { z } from "zod";
import { sourceId } from "../student/input";

export const supportInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("report"),
      category: z.enum(["account", "learning", "accessibility", "technical"]),
      subject: z.string().trim().min(4).max(120),
      body: z.string().trim().min(10).max(3000),
    })
    .strict(),
  z
    .object({ action: z.literal("deletion"), confirmation: z.literal("DELETE MY ACCOUNT") })
    .strict(),
  z.object({ action: z.literal("cancelDeletion"), id: sourceId }).strict(),
  z
    .object({
      action: z.literal("respond"),
      id: sourceId,
      status: z.enum(["in_review", "resolved"]),
      response: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);

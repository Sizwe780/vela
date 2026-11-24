import { z } from "zod";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const enrollmentInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("enroll"),
      qualificationId: id,
      year: z.number().int().min(2000).max(9999).optional(),
      semester: z.union([z.literal(1), z.literal(2)]).optional(),
      languageConfirmed: z.boolean().optional(),
      moduleIds: z
        .array(id)
        .min(1)
        .max(40)
        .refine((ids) => new Set(ids).size === ids.length, "Select each module once"),
    })
    .strict(),
  z.object({ action: z.literal("withdraw"), enrollmentId: id }).strict(),
  z.object({ action: z.literal("complete"), enrollmentId: id }).strict(),
]);
export const accessibleStatuses = ["active", "completed"] as const;

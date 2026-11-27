import { z } from "zod";
export const sourceId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const profileInput = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    weeklyGoalMinutes: z.number().int().min(15).max(1200),
    emailReminders: z.boolean().default(false),
    classroomAlerts: z.boolean().optional(),
    autoStartTimer: z.boolean().optional(),
  })
  .strict();
export const positionInput = z.object({ sessionId: sourceId }).strict();
export const bookmarkInput = z
  .object({
    studyUnitId: sourceId,
    sourceType: z.enum(["session", "chunk"]),
    sourceId,
    quote: z.string().trim().max(2000).default(""),
  })
  .strict();

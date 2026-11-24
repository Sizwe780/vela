import { z } from "zod";
import { sourceId } from "../student/input";
export const activityInput = z
  .object({
    sessionId: sourceId,
    trackingId: z.string().uuid(),
    action: z.enum(["start", "pulse", "stop"]),
    takeover: z.boolean().optional(),
  })
  .strict();

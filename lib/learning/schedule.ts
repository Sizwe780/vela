import { z } from "zod";
export const slotSchema = z
  .object({
    startAt: z.string().datetime({ offset: true }),
    minutes: z.number().int().min(10).max(120),
  })
  .strict();
export const availabilitySchema = z
  .array(slotSchema)
  .max(14)
  .superRefine((slots, ctx) => {
    const sorted = [...slots].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    for (let i = 1; i < sorted.length; i++)
      if (
        Date.parse(sorted[i].startAt) <
        Date.parse(sorted[i - 1].startAt) + sorted[i - 1].minutes * 60000
      )
        ctx.addIssue({ code: "custom", message: "Availability periods cannot overlap." });
  });
export function studyPeriods(slots: z.infer<typeof availabilitySchema>, now: Date) {
  return slots
    .filter(
      (s) =>
        Date.parse(s.startAt) >= now.getTime() &&
        Date.parse(s.startAt) <= now.getTime() + 30 * 86400000,
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
    .slice(0, 5)
    .map((s) => ({
      startAt: s.startAt,
      minutes: Math.min(25, s.minutes),
      availableMinutes: s.minutes,
    }));
}

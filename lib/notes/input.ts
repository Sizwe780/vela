import { z } from "zod";
export const noteInput = z
  .object({
    studyUnitId: z.string().min(1).max(100),
    body: z.string().max(16000),
    revision: z.number().int().min(0),
    ownerId: z.string().min(1).max(200).optional(),
  })
  .strict();
export function clipNote(body: string, title: string, text: string) {
  return `${body}${body ? "\n\n" : ""}## ${title}\n\n${text}`;
}

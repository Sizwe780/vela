import { z } from "zod";
import { unsafeMathFormatting } from "./display";
const latex = z
  .string()
  .max(1200)
  .refine(
    (v) => !unsafeMathFormatting(v),
    "Use mathematical notation without links or formatting commands.",
  );
export const savedOperation = z
  .object({
    kind: z.enum(["swap", "scale", "add"]),
    source: z.number().int().min(1).max(3),
    target: z.number().int().min(1).max(3),
    factor: latex.pipe(z.string().max(80)),
  })
  .strict();
export const practiceSnapshot = z
  .object({
    version: z.literal(1),
    reference: latex.refine((v) => !!v.trim()),
    draft: latex,
    mode: z.enum(["expression", "antiderivative", "derivative"]),
    variable: z.enum(["x", "y", "z", "t"]),
    matrix: z.boolean(),
    operation: savedOperation,
    context: z.string().max(4000),
    lines: z
      .array(
        z.object({ latex: latex.refine((v) => !!v.trim()), operation: savedOperation }).strict(),
      )
      .max(20),
  })
  .strict();
export type PracticeSnapshot = z.infer<typeof practiceSnapshot>;
export const notebookInput = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(120),
    reflection: z.string().max(4000),
    kind: z.enum(["practice", "mistake"]),
    snapshot: practiceSnapshot,
  })
  .strict()
  .refine(
    (v) => new TextEncoder().encode(JSON.stringify(v)).length <= 64000,
    "Keep the notebook entry below 64 KB.",
  );

import { z } from "zod";
export const bktParameters = z
  .object({
    prior: z.number().gt(0).lt(1),
    learn: z.number().min(0).lt(1),
    guess: z.number().gt(0).lt(1),
    slip: z.number().gt(0).lt(1),
  })
  .strict()
  .refine((p) => p.guess + p.slip < 1);
export type BKTParameters = z.infer<typeof bktParameters>;
export function updateBKT(prior: number, correct: boolean, parameters: BKTParameters) {
  const p = bktParameters.parse(parameters);
  if (!Number.isFinite(prior) || prior < 0 || prior > 1) throw Error("Invalid concept probability");
  const known = correct ? 1 - p.slip : p.slip,
    unknown = correct ? p.guess : 1 - p.guess;
  const posterior = (prior * known) / (prior * known + (1 - prior) * unknown);
  return { posterior, probability: posterior + (1 - posterior) * p.learn };
}

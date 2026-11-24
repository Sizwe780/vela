import { z } from "zod";
const label = z.string().max(120).optional();
const legacy = z
  .object({
    type: z.enum(["graph", "secant", "derivative", "limit", "vector"]),
    data: z
      .object({
        label,
        coefficients: z
          .tuple([z.number().min(-3).max(3), z.number().min(-3).max(3), z.number().min(-3).max(3)])
          .optional(),
      })
      .strict(),
  })
  .strict();
const coefficient = z.number().min(-20).max(20);
const polynomial = z.tuple([coefficient, coefficient, coefficient]);
export const widgetSchema = z.discriminatedUnion("type", [
  legacy,
  z
    .object({
      type: z.literal("matrix"),
      data: z
        .object({
          label,
          matrix: z.tuple([
            z.number().min(-3).max(3),
            z.number().min(-3).max(3),
            z.number().min(-3).max(3),
            z.number().min(-3).max(3),
          ]),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("riemann"),
      data: z
        .object({
          label,
          coefficients: polynomial,
          bounds: z
            .tuple([z.number().min(-4).max(4), z.number().min(-4).max(4)])
            .refine(([a, b]) => b - a >= 0.25, "Choose increasing bounds at least 0.25 apart"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("limitzoom"),
      data: z
        .object({ label, coefficients: polynomial, center: z.number().min(-20).max(20) })
        .strict(),
    })
    .strict(),
]);
export type WidgetFrame = z.infer<typeof widgetSchema>;
export function companionCards(text: string) {
  const widgets: WidgetFrame[] = [];
  const parsed = text
    .replace(
      /<(?:render_widget|widget)\s+type="([a-z]+)"\s+data='([^']{1,2000})'\s*\/>|```widget\s*([\s\S]*?)```/g,
      (_, type, data, raw) => {
        try {
          const result = widgetSchema.safeParse(
            raw === undefined ? { type, data: JSON.parse(data) } : JSON.parse(raw),
          );
          if (result.success && widgets.length < 3) widgets.push(result.data);
        } catch {}
        return "";
      },
    )
    .replace(/<(?:render_widget|widget)[\s\S]*?(?:\/>|$)/g, "")
    .replace(/```widget[\s\S]*$/g, "");
  const sections = parsed.split(
    /^#{2,3}\s+(Core Answer|Step-by-Step Derivation|CAPS Didactic Note)\s*$/gim,
  );
  const cards = [{ title: "Core Answer", text: sections[0].trim() }];
  for (let i = 1; i < sections.length; i += 2)
    cards.push({ title: sections[i], text: sections[i + 1]?.trim() ?? "" });
  return { cards: cards.filter((card) => card.text), widgets };
}

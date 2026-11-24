import registry from "../.vela/module-capabilities.json";
import { z } from "zod";
export type ModuleCapabilities = {
  math: boolean;
  matrix: boolean;
  calculus: boolean;
  units: boolean;
  physics: boolean;
  molecules: boolean;
  reactions: boolean;
  pck: boolean;
  debate: boolean;
};
export const universalCapabilities: ModuleCapabilities = {
  math: false,
  matrix: false,
  calculus: false,
  units: false,
  physics: false,
  molecules: false,
  reactions: false,
  pck: false,
  debate: false,
};
const overrideSchema = z
  .object({
    runtimeCapabilities: z
      .object({
        version: z.literal(1),
        tools: z
          .array(
            z.enum([
              "math",
              "matrix",
              "calculus",
              "units",
              "physics",
              "molecules",
              "reactions",
              "pck",
              "debate",
            ]),
          )
          .max(9)
          .refine((t) => new Set(t).size === t.length)
          .refine((t) => !(t.includes("matrix") || t.includes("calculus")) || t.includes("math")),
      })
      .strict(),
  })
  .passthrough();
export function moduleCapabilities(
  institution: string,
  moduleCode: string,
  metadata?: unknown,
): ModuleCapabilities {
  const registered = registry.profiles.find(
    (p) => p.institution === institution && p.moduleCode === moduleCode,
  )?.tools as string[] | undefined;
  const override = overrideSchema.safeParse(metadata);
  const hasOverride =
    !!metadata && typeof metadata === "object" && Object.hasOwn(metadata, "runtimeCapabilities");
  if (hasOverride && !override.success) return { ...universalCapabilities };
  const tools = override.success ? override.data.runtimeCapabilities.tools : registered;
  return {
    math: !!tools?.includes("math"),
    matrix: !!tools?.includes("matrix"),
    calculus: !!tools?.includes("calculus"),
    units: !!tools?.includes("units"),
    physics: !!tools?.includes("physics"),
    molecules: !!tools?.includes("molecules"),
    reactions: !!tools?.includes("reactions"),
    pck: !!tools?.includes("pck"),
    debate: !!tools?.includes("debate"),
  };
}
export function combineCapabilities(profiles: ModuleCapabilities[]) {
  return Object.fromEntries(
    Object.keys(universalCapabilities).map((key) => [
      key,
      profiles.some((p) => p[key as keyof ModuleCapabilities]),
    ]),
  ) as ModuleCapabilities;
}
export function permitsWidget(c: ModuleCapabilities, type: string) {
  return type === "matrix" || type === "vector"
    ? c.matrix
    : ["riemann", "limitzoom", "secant", "derivative", "limit"].includes(type)
      ? c.calculus
      : type === "graph" && c.math;
}

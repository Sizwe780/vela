import { teachingFrameworkIds } from "./teaching-frameworks";
import { z } from "zod";
import type { ModuleCapabilities } from "../capabilities";
import { chemistryExplorations } from "./chemistry-explorations";
import { linearExplorations } from "./linear-explorations";
import { visualPresetIds } from "./visual-presets";
import { calculusCurves, type CalculusCurveId } from "./calculus-models";
import { physicsWorkshopIds } from "../sandboxes/physics";

const linearModels = [
  "linear-system",
  "row-operation",
  "determinant-area",
  "vector-combination",
  "complex-plane",
] as const;
const matrixEntry = z.number().finite().min(-3).max(3).multipleOf(0.25);
type PresetId = (typeof visualPresetIds)[number];
const presetIds = visualPresetIds as [PresetId, ...PresetId[]];
const calculusIds = Object.keys(calculusCurves) as [CalculusCurveId, ...CalculusCurveId[]];
const presetCapabilities: Partial<Record<PresetId, keyof ModuleCapabilities>> = {
  "bonding-scale": "molecules", "orbital-filling": "molecules", "molecular-geometry": "molecules",
  "ionic-precipitation": "reactions", "equation-balancing": "reactions", "redox-practice": "reactions",
  "stoichiometry-lab": "reactions", "equilibrium-lab": "reactions", "concentration-lab": "units",
  "ideal-gas-lab": "units", "density-model": "units", "energy-level-model": "units",
  composition: "calculus", optimization: "calculus", limit: "calculus", continuity: "calculus", tangent: "calculus", integral: "calculus",
};
type LinearExplorationId = keyof typeof linearExplorations;
type ChemistryExplorationId = keyof typeof chemistryExplorations;
const linearExplorationIds = Object.keys(linearExplorations) as [
  LinearExplorationId,
  ...LinearExplorationId[],
];
const chemistryExplorationIds = Object.keys(chemistryExplorations) as [
  ChemistryExplorationId,
  ...ChemistryExplorationId[],
];

const coefficient = z.number().int().min(1).max(8);
const value = z.number().finite().min(-100).max(100);
export const widgetSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("physics_workshop"), config: z.object({ model: z.enum(physicsWorkshopIds) }).strict() }).strict(),
    z.object({ type: z.literal("reaction_energy"), config: z.object({}).strict() }).strict(),
    z.object({ type: z.literal("lesson_preset"), config: z.object({ model: z.enum(presetIds) }).strict() }).strict(),
    z.object({ type: z.literal("calculus_curve"), config: z.object({ model: z.enum(calculusIds) }).strict() }).strict(),
    z.object({ type: z.literal("spatial_plane"), config: z.object({ mode: z.enum(["normal", "intersection", "distance"]) }).strict() }).strict(),
    z
      .object({
        type: z.literal("linear_exploration"),
        config: z.object({ model: z.enum(linearExplorationIds) }).strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("chemistry_exploration"),
        config: z.object({ model: z.enum(chemistryExplorationIds) }).strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("linear_model"),
        config: z.object({ model: z.enum(linearModels) }).strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("matrix_transform"),
        config: z
          .object({ a: matrixEntry, b: matrixEntry, c: matrixEntry, d: matrixEntry })
          .strict(),
      })
      .strict(),
    z.object({ type: z.literal("orbital_overlap"), config: z.object({}).strict() }).strict(),
    z
      .object({
        type: z.literal("teaching_framework"),
        config: z.object({ framework: z.enum(teachingFrameworkIds) }).strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("vsepr_geometry"),
        config: z
          .object({
            molecule: z.enum(["carbonDioxide", "boronTrifluoride", "methane", "ammonia", "water"]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("reaction_balance"),
        config: z
          .object({
            reaction: z.enum(["water", "iron"]),
            a: coefficient,
            b: coefficient,
            c: coefficient,
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("density_model"),
        config: z
          .object({
            mass: z.number().int().min(5).max(160).multipleOf(5),
            volume: z.number().int().min(5).max(80).multipleOf(5),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        type: z.literal("riemann_sum"),
        config: z
          .object({
            quadratic: value,
            linear: value,
            constant: value,
            start: value,
            end: value,
          })
          .strict(),
      })
      .strict(),
  ])
  .superRefine((widget, ctx) => {
    if (widget.type === "riemann_sum" && widget.config.end <= widget.config.start)
      ctx.addIssue({
        code: "custom",
        path: ["config", "end"],
        message: "The interval must have positive width.",
      });
  });

export type LessonWidget = z.infer<typeof widgetSchema>;
export const widgetDefinitions: Record<
  LessonWidget["type"],
  { capability: keyof ModuleCapabilities; description: string }
> = {
  physics_workshop: { capability: "physics", description: "model: " + physicsWorkshopIds.join(", ") },
  reaction_energy: { capability: "reactions", description: "No parameters. Compare reactant and product energies and the pathway barrier." },
  lesson_preset: { capability: "matrix", description: "model: " + presetIds.join(", ") },
  calculus_curve: { capability: "calculus", description: "model: " + calculusIds.join(", ") },
  spatial_plane: { capability: "matrix", description: "mode: normal, intersection or distance" },
  linear_exploration: {
    capability: "matrix",
    description: "model: " + linearExplorationIds.join(", "),
  },
  chemistry_exploration: {
    capability: "reactions",
    description: "model: " + chemistryExplorationIds.join(", "),
  },
  linear_model: { capability: "matrix", description: "model: " + linearModels.join(", ") },
  matrix_transform: {
    capability: "matrix",
    description: "a, b, c, d: initial matrix entries from −3 to 3, increments of 0.25",
  },
  orbital_overlap: {
    capability: "molecules",
    description: "No parameters. Compare end-on and side-by-side overlap.",
  },
  teaching_framework: {
    capability: "pck",
    description: "framework: " + teachingFrameworkIds.join(", "),
  },
  vsepr_geometry: {
    capability: "molecules",
    description: 'molecule: "water", "ammonia", "methane", "boronTrifluoride" or "carbonDioxide"',
  },
  reaction_balance: {
    capability: "reactions",
    description:
      'reaction: "water" or "iron"; a, b, c: initial integer coefficients 1–8, preferably unbalanced',
  },
  density_model: {
    capability: "units",
    description: "mass in grams 5–160, volume in mL 5–80; both multiples of five",
  },
  riemann_sum: {
    capability: "calculus",
    description:
      "quadratic, linear, constant, start and end: finite numbers from −100 to 100; start < end",
  },
};

export function widgetDirective(widget: LessonWidget): string {
  const params = Object.entries(widget.config).map(([key, val]) => key + "=" + JSON.stringify(val));
  return [':::widget{type="' + widget.type + '"', ...params].join(" ") + "}\n:::";
}

export function widgetCapability(widget: LessonWidget): keyof ModuleCapabilities {
  if (widget.type === "lesson_preset") return presetCapabilities[widget.config.model] ?? "matrix";
  return widgetDefinitions[widget.type].capability;
}

export function readWidgetDirective(directive: string): LessonWidget {
  const match = /^:::widget\{([^{}\n]{1,350})\}$/.exec(directive.trim());
  if (!match) throw new Error("Malformed widget directive.");
  const attrs = Object.create(null) as Record<string, string | number>;
  let rest = match[1].trim();
  while (rest.length) {
    const pair =
      /^([a-zA-Z][a-zA-Z0-9]*)=("(?:[a-zA-Z0-9_-]+)"|-?(?:\d+(?:\.\d+)?)(?:[eE][+-]?\d+)?)(?=\s|$)/.exec(
        rest,
      );
    if (!pair || Object.hasOwn(attrs, pair[1]))
      throw new Error("Invalid or duplicate widget parameter.");
    attrs[pair[1]] = JSON.parse(pair[2]);
    rest = rest.slice(pair[0].length).trimStart();
  }
  const { type, ...config } = attrs;
  return widgetSchema.parse({ type, config });
}

export type WidgetBlock = { type: "text"; text: string } | { type: "widget"; widget: LessonWidget };
export function parseWidgetBlocks(markdown: string) {
  const lines = markdown.split("\n");
  const blocks: WidgetBlock[] = [];
  const errors: string[] = [];
  let prose: string[] = [];
  let fence = "";
  function flush() {
    if (prose.length) blocks.push({ type: "text", text: prose.join("\n") });
    prose = [];
  }
  for (const [i, line] of lines.entries()) {
    const marker = /^ {0,3}(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim())
        fence = "";
      prose.push(line);
    } else if (fence || !/^\s*:::widget\b/.test(line)) {
      if (i > 0 && line.trim() === ":::" && /^\s*:::widget\b/.test(lines[i - 1])) continue;
      prose.push(line);
    } else {
      try {
        if (lines[i + 1]?.trim() !== ":::")
          throw new Error("A widget must end with ::: on the next line.");
        const widget = readWidgetDirective(line);
        flush();
        blocks.push({ type: "widget", widget });
      } catch (error) {
        errors.push(
          "Line " +
            (i + 1) +
            ": " +
            (error instanceof z.ZodError
              ? "Unsupported widget or parameters."
              : (error as Error).message),
        );
      }
    }
  }
  flush();
  return { blocks, errors };
}

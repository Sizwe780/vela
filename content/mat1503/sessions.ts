import { systemsUnits } from "./systems";
import { determinantUnits } from "./determinants";
import { vectorUnits } from "./vectors-complex";
import { visualPresets } from "../../lib/content/visual-presets";
import { addInlineExplorations } from "../inline-explorations";
import { linearInlineModels } from "./inline-models";
const hooks: Record<number, string> = {
  1: "linear-system",
  2: "row-operation",
  3: "matrix-transform",
  4: "matrix-transform",
  5: "row-operation",
  6: "linear-system",
  8: "determinant-area",
  9: "row-operation",
  10: "determinant-area",
  11: "vector-combination",
  12: "vector-projection",
  13: "complex-plane",
};
export const curriculum = [...systemsUnits, ...determinantUnits, ...vectorUnits]
  .sort((a, b) => a.position - b.position)
  .map((unit) =>
    addInlineExplorations(
      {
        ...unit,
        sessions: unit.sessions.map((session, index) => {
          const visual =
            (index === 0 ? (hooks[unit.position] ?? session.visual) : session.visual) ?? null;
          const model = visualPresets.find((preset) => preset.id === visual);
          const markdown = model
            ? session.markdown.replace(
                "## Procedure",
                `Independent interactive model: ${model.description}. Explore its parameters as a separate teaching model; the gated worked problem below has its own givens.\n\n## Procedure`,
              )
            : session.markdown;
          return { ...session, visual, markdown };
        }),
      },
      linearInlineModels,
    ),
  );

import type { CalculusCurveId } from "../../lib/content/calculus-models";
import type { LessonWidget } from "../../lib/content/widget-registry";

const curve = (model: CalculusCurveId): LessonWidget => ({ type: "calculus_curve", config: { model } });

export const calculusInlineModels: Readonly<Record<string, LessonWidget>> = {
  "Infinity and asymptotes": curve("asymptote"),
  "Domains and reversible descriptions": curve("hole"),
  "One-sided reasoning and rationalisation": curve("hole"),
  "Continuity as an existence argument": curve("existence"),
  "Rules as compressed reasoning": curve("product"),
  "When a tangent fails to exist": curve("corner"),
  "Use a tangent as a local model": curve("tangent"),
  "Deriving rules from small changes": curve("product"),
  "A differentiation diagnostic workshop": curve("corner"),
  "Implicit curves and logarithmic reasoning": curve("implicit"),
  "Related rates with a model boundary": curve("related"),
  "A connected derivative reference": curve("chain"),
  "Tangent constraints and inverse reasoning": curve("implicit"),
  "A multi-step derivative investigation": curve("chain"),
  "Extrema as a decision process": curve("extrema"),
  "Shape, concavity and indeterminate limits": curve("concavity"),
  "Assemble a complete rational-curve story": curve("asymptote"),
  "Mean value reasoning and uniqueness": curve("mean"),
  "Optimisation and limit method selection": curve("optimise"),
  "The two directions of the fundamental theorem": curve("fundamental"),
  "Substitution and a final transfer check": curve("substitution"),
  "Trigonometric and exponential accumulation": curve("accumulation"),
  "An accumulation transfer workshop": curve("accumulation"),
};

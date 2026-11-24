import { matrixLatex, reducedMatrix } from "./matrix";
import type { MathProblem } from "./types";
export const mathTopics = [
  { id: "expand", label: "Algebraic expansion" },
  { id: "derivative", label: "Differentiation" },
  { id: "integral", label: "Integration by parts" },
  { id: "limit", label: "Removable limits" },
  { id: "matrix", label: "Row reduction" },
] as const;
export function randomProblemSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
export function createMathProblem(topic: MathProblem["topic"], seed: number): MathProblem {
  let state = seed >>> 0;
  const pick = (min: number, max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
  const a = pick(1, 5) * (pick(0, 1) ? 1 : -1),
    b = pick(1, 7) * (pick(0, 1) ? 1 : -1),
    c = pick(-6, 6);
  const signed = (n: number) => (n >= 0 ? `+${n}` : String(n));
  const id = `${topic}:${seed >>> 0}`;
  if (topic === "expand")
    return {
      id,
      topic,
      title: "One expression, two useful forms",
      question:
        "Expand this expression without changing its value. Write a complete equivalent line each time.",
      reference: `\\left(${a}x${signed(b)}\\right)^2`,
      mode: "expression",
      answer: `${a * a}x^2${signed(2 * a * b)}x+${b * b}`,
      explanation:
        "Multiply the two equal factors. The middle term appears twice: once from each cross-product. Pause and predict its sign before collecting terms.",
    };
  if (topic === "derivative")
    return {
      id,
      topic,
      title: "Differentiate one contribution at a time",
      question:
        "Rewrite the derivative as a sum of simpler derivatives, then evaluate the terms. The d/dx keyboard template is supported.",
      reference: `\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(${a}x^3${signed(b)}x^2${signed(c)}x\\right)`,
      mode: "expression",
      answer: `${3 * a}x^2${signed(2 * b)}x${signed(c)}`,
      explanation:
        "Differentiate each term independently. A constant coefficient stays in front; the old power multiplies it and the exponent decreases by one. Compare the resulting powers before simplifying signs.",
    };
  if (topic === "integral") {
    const k = pick(1, 4);
    return {
      id,
      topic,
      title: "Choose a part that becomes simpler",
      question:
        "Use integration by parts. You may enter an equivalent expression with a remaining indefinite integral, then simplify it. Include dx after each integral.",
      reference: `\\int ${a}x\\cos\\left(${k}x\\right)\\,\\mathrm{d}x`,
      mode: "antiderivative",
      answer: `\\frac{${a}x\\sin(${k}x)}{${k}}+\\frac{${a}\\cos(${k}x)}{${k * k}}+C`,
      explanation: `Choose u=${a}x, so du=${a} dx, and integrate cos(${k}x) to obtain sin(${k}x)/${k}. Apply uv−∫v du. Integrating sine introduces a minus sign, which changes the remaining minus into a plus. Differentiate your result as a final check.`,
    };
  }
  if (topic === "limit") {
    const r = pick(-4, 4),
      factor = `\\left(x${signed(-r)}\\right)`;
    return {
      id,
      topic,
      title: "A nearby value without filling the hole",
      question: `Simplify for x≠${r}, keeping the limit notation until you can evaluate. Explain why cancelling the factor does not define the original function at the hole.`,
      reference: `\\lim_{x\\to ${r}}\\left(\\frac{${a}${factor}^2${signed(b)}${factor}}{${factor}}\\right)`,
      mode: "expression",
      answer: String(b),
      explanation: `Factor out x−(${r}) in the numerator and cancel only for x≠${r}. The nearby expression is ${a}(x−(${r}))+(${b}), whose value approaches ${b}. A limit describes nearby behaviour; it does not restore an excluded input.`,
    };
  }
  const solution = [pick(-4, 4), pick(-4, 4), pick(-4, 4)];
  const base = [
    [1, a, b],
    [0, 1, c],
    [0, 0, 1],
  ];
  base[1] = base[1].map((v, j) => v + 2 * base[0][j]);
  base[2] = base[2].map((v, j) => v - base[1][j]);
  if (pick(0, 1)) [base[0], base[2]] = [base[2], base[0]];
  const reference = matrixLatex(
    base.map((row) => [...row, row.reduce((sum, v, i) => sum + v * solution[i], 0)]),
  );
  return {
    id,
    topic: "matrix",
    title: "Make the row operation explicit",
    question:
      "Row-reduce this augmented system. Choose the exact row operation you are performing and enter the entire resulting matrix, including the constants column.",
    reference,
    mode: "expression",
    answer: reducedMatrix(reference),
    explanation: `Every elementary row operation is reversible. Apply it to the whole row, including the last column. The reduced matrix gives x=${solution[0]}, y=${solution[1]}, z=${solution[2]}; substitute these values into the original rows to verify them.`,
  };
}

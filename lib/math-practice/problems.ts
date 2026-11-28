import { matrixLatex, reducedMatrix } from "./matrix";
import type { MathProblem } from "./types";
export const mathTopics = [
  { id: "expand", label: "Algebraic expansion" },
  { id: "derivative", label: "Differentiation" },
  { id: "integral", label: "Integration: substitution & parts" },
  { id: "limit", label: "Limits & discontinuities" },
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
  if (topic === "expand") {
    const family = (seed >>> 0) % 3,
      power = pick(3, 6);
    const linear = [b, a],
      trinomial = [b, c || 1, 1];
    const expression =
      family === 0
        ? `\\left(${a}x${signed(b)}\\right)^{${power}}`
        : family === 1
          ? `\\left(x^2${signed(c || 1)}x${signed(b)}\\right)^{${pick(2, 3)}}`
          : `\\left(x+1\\right)\\left(${a}x${signed(b)}\\right)^3-\\left(x^2${signed(c || 1)}x${signed(b)}\\right)^2`;
    const exponent = family === 1 ? Number(/\^\{(\d)\}$/.exec(expression)![1]) : power;
    const coefficients =
      family === 0
        ? polynomialPower(linear, exponent)
        : family === 1
          ? polynomialPower(trinomial, exponent)
          : polynomialAdd(
              polynomialMultiply([1, 1], polynomialPower(linear, 3)),
              polynomialPower(trinomial, 2).map((n) => -n),
            );
    return {
      id,
      topic,
      title: [
        "Higher powers, one equivalent line at a time",
        "Collect every cross-product",
        "Mix products without losing a sign",
      ][family],
      question:
        "Expand, factor or regroup by any valid method. Each complete line is compared with your last accepted line, not a prescribed answer sequence.",
      reference: expression,
      mode: "expression",
      answer: polynomialLatex(coefficients),
      explanation:
        "Distribute each factor over every term, collect equal powers, then check coefficients and signs. You can expand one factor at a time or factor common terms first; both preserve the expression.",
    };
  }
  if (topic === "derivative" && (seed >>> 0) % 3) {
    const k = pick(1, 3),
      mixed = (seed >>> 0) % 3 === 1;
    const body = mixed
      ? `e^{${k}x}\\sin(${k + 1}x)+\\frac{\\ln(x^2+1)}{x+1}`
      : `\\sqrt{x+${k}}+\\ln(x^2+1)`;
    return {
      id,
      topic,
      title: mixed
        ? "Combine product, chain and quotient rules"
        : "Differentiate roots and logarithms on their domains",
      question:
        "Keep the full expression in each line. You may leave one derivative unevaluated while working on another term. Compare equivalent forms and retain the real-domain conditions.",
      reference: `\\frac{d}{dx}\\left(${body}\\right)`,
      mode: "expression",
      answer: mixed
        ? `e^{${k}x}(${k}\\sin(${k + 1}x)+${k + 1}\\cos(${k + 1}x))+\\frac{\\frac{2x}{x^2+1}(x+1)-\\ln(x^2+1)}{(x+1)^2}`
        : `\\frac{1}{2\\sqrt{x+${k}}}+\\frac{2x}{x^2+1}`,
      explanation: mixed
        ? "Differentiate the product with the chain rule in both factors; use the quotient rule for the logarithmic fraction. The denominator excludes x=-1. Keep every other term when simplifying one contribution."
        : `The square-root derivative applies for x>-${k}; the logarithm's argument x²+1 is positive for all real x. The original function may be defined at a boundary where this derivative formula is not.`,
    };
  }
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
    const k = pick(1, 4),
      family = (seed >>> 0) % 5;
    const examples = [
      {
        reference: `\\int ${a}x\\cos(${k}x)\\,dx`,
        answer: `\\frac{${a}x\\sin(${k}x)}{${k}}+\\frac{${a}\\cos(${k}x)}{${k * k}}+C`,
        title: "A polynomial meets a trigonometric function",
        explanation:
          "Choose the polynomial for u and integrate cosine for dv. Apply uv minus the remaining integral. Differentiate the whole result to check it.",
      },
      {
        reference: `\\int ${a}x e^{-${k}x}\\,dx`,
        answer: `-${a}e^{-${k}x}\\left(\\frac{x}{${k}}+\\frac{1}{${k * k}}\\right)+C`,
        title: "Integration by parts with exponential decay",
        explanation:
          "Differentiate the polynomial and integrate the exponential. Keep the negative reciprocal from the exponential's inner derivative, then verify with the product rule.",
      },
      {
        reference: `\\int \\frac{3x^2+2x}{x^3+x^2+${k}}\\,dx`,
        answer: `\\ln\\left|x^3+x^2+${k}\\right|+C`,
        title: "Recognise a logarithmic derivative",
        explanation:
          "The numerator is the derivative of the denominator. Substitute u for that denominator. The real primitive is ln|u| on each connected interval where u is nonzero; crossing a root requires a separate interval.",
      },
      {
        reference: `\\int ${2 * k}x e^{${k}x^2}\\,dx`,
        answer: `e^{${k}x^2}+C`,
        title: "Substitution inside an exponential",
        explanation:
          "Set u equal to the quadratic exponent. Its derivative supplies the factor beside the exponential. After integrating, return to x and check with the chain rule.",
      },
      {
        reference: `\\int x\\ln(x)\\,dx`,
        answer: `\\frac{x^2}{2}\\ln(x)-\\frac{x^2}{4}+C`,
        title: "Integration by parts with a logarithm",
        explanation:
          "Work on x>0. Choose u=ln(x), dv=x dx. The remaining integral is a polynomial. This real logarithm does not define the same formula on x≤0.",
      },
    ];
    return {
      id,
      topic,
      ...examples[family],
      mode: "antiderivative",
      question:
        "Choose substitution, integration by parts or an equivalent rewrite. Include dx on remaining integrals and keep domain conditions. The checker differentiates your proposed primitive against the original integrand.",
    };
  }
  if (topic === "limit") {
    const family = (seed >>> 0) % 4;
    const k = pick(1, 5);
    if (family) {
      const examples = [
        {
          reference: `\\lim_{x\\to 0}\\left(\\frac{\\sqrt{x+${k * k}}-${k}}{x}\\right)`,
          answer: `\\frac{1}{${2 * k}}`,
          title: "Rationalise before approaching",
          explanation:
            "Multiply by the conjugate, cancel x only for x≠0, and keep the limit attached. The square-root argument is positive near zero, so both sides are real.",
        },
        {
          reference: `\\lim_{x\\to 0}\\left(\\frac{\\sin(${k}x)}{x}\\right)`,
          answer: String(k),
          title: "A trigonometric indeterminate form",
          explanation:
            "Scale the standard sin(u)/u limit with u=kx. Angles are in radians. The original expression is undefined at zero, although its two-sided limit exists.",
        },
        {
          reference: `\\lim_{x\\to 0}\\left(\\frac{e^{${k}x}-1}{x}\\right)`,
          answer: String(k),
          title: "An exponential near zero",
          explanation:
            "Use the derivative of the exponential at zero, or substitute u=kx in the standard exponential limit. Keep the punctured-domain restriction x≠0 until the limit is evaluated.",
        },
      ];
      return {
        id,
        topic,
        ...examples[family - 1],
        mode: "expression",
        question:
          "Rewrite while retaining the limit, then evaluate it. Distinguish the value approached from the undefined value at the original hole. Poles and one-sided domain boundaries need separate arguments.",
      };
    }
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

function polynomialMultiply(a: number[], b: number[]) {
  const result = Array(a.length + b.length - 1).fill(0) as number[];
  a.forEach((x, i) => b.forEach((y, j) => (result[i + j] += x * y)));
  return result;
}
function polynomialPower(a: number[], n: number) {
  let result = [1];
  for (let i = 0; i < n; i++) result = polynomialMultiply(result, a);
  return result;
}
function polynomialAdd(a: number[], b: number[]) {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
}
function polynomialLatex(values: number[]) {
  return (
    values
      .map((v, i) =>
        !v
          ? ""
          : `${v > 0 ? "+" : "-"}${Math.abs(v) === 1 && i ? "" : Math.abs(v)}${i ? `x${i > 1 ? `^{${i}}` : ""}` : ""}`,
      )
      .reverse()
      .join("")
      .replace(/^\+/, "") || "0"
  );
}

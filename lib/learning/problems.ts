import { createHash } from "node:crypto";
import type { ConceptNode } from "./graph";
export function conceptProblem(kind: ConceptNode["probeKind"], seed: number) {
  let state = seed >>> 0;
  const pick = (a: number, b: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return a + (state % (b - a + 1));
  };
  let prompt: string, values: string[], explanation: string;
  const a = pick(2, 8),
    b = pick(1, 7),
    x = pick(2, 12),
    n = pick(2, 5);
  if (kind === "balance") {
    const c = a * x + b;
    prompt = `Solve $${a}x+${b}=${c}$.`;
    values = [String(x), String(x + 1), String(x - 1), String(c)];
    explanation = `Subtract ${b} on both sides, then divide both sides by nonzero ${a}. Substitution confirms $x=${x}$.`;
  } else if (kind === "powers") {
    const m = pick(2, 7);
    prompt = `For positive $x$, simplify $x^{${n}}x^{${m}}$.`;
    values = [
      `$x^{${n + m}}$`,
      `$x^{${n + m + 1}}$`,
      `$x^{${n + m - 1}}$`,
      `$x^{${Math.abs(n - m)}}$`,
    ];
    explanation = `A product of powers of the same positive base combines factors, so add the exponents: ${n}+${m}=${n + m}. This rule does not apply to a sum of powers.`;
  } else if (kind === "limit") {
    const k = pick(3, 12);
    prompt = `For $t\\ne${k}$, find $\\lim_{t\\to${k}}\\frac{t^2-${k * k}}{t-${k}}$.`;
    values = [2 * k, k, 2 * k + 1, 2 * k - 1].map(String);
    explanation = `Factor $t^2-${k * k}=(t-${k})(t+${k})$. Cancel only for $t\\ne${k}$; the nearby rule approaches ${2 * k}. The original quotient remains undefined at the target.`;
  } else if (kind === "derivative") {
    prompt = `Differentiate $f(x)=${a}x^{${n}}$.`;
    values = [
      `$${a * n}x^{${n - 1}}$`,
      `$${a * n}x^{${n}}$`,
      `$${a}x^{${n - 1}}$`,
      `$${a * n + 1}x^{${n - 1}}$`,
    ];
    explanation = `The positive-integer power rule multiplies the coefficient by ${n} and lowers the exponent by one: $f'(x)=${a * n}x^{${n - 1}}$.`;
  } else if (kind === "chain") {
    prompt = `Differentiate $f(x)=(${a}x+${b})^{${n}}$.`;
    values = [
      `$${n * a}(${a}x+${b})^{${n - 1}}$`,
      `$${n}(${a}x+${b})^{${n - 1}}$`,
      `$${a}(${a}x+${b})^{${n}}$`,
      `$${n * a}(${a}x+${b})^{${n}}$`,
    ];
    explanation = `Differentiate the outer power, retain its inner argument, and multiply by the inner derivative ${a}. Thus $f'(x)=${n * a}(${a}x+${b})^{${n - 1}}$.`;
  } else if (kind === "ftc") {
    const c = a * x + b;
    prompt = `Let $F(x)=\\int_0^x(${a}t+${b})\\,dt$. Find $F'(${x})$.`;
    values = [c, c - a, c + a, c + 1].map(String);
    explanation = `The integrand is continuous, so $F'(x)=${a}x+${b}$. Evaluating at ${x} gives ${c}; no extra integral or endpoint factor is required here.`;
  } else if (kind === "row") {
    const c = pick(1, 8);
    prompt = `For augmented rows $R_1=[1,${b}\\mid${x}]$ and $R_2=[${a},${a * b + 1}\\mid${a * x + c}]$, compute $R_2-${a}R_1$.`;
    values = [
      `$[0,1\\mid${c}]$`,
      `$[0,1\\mid${a * x + c}]$`,
      `$[0,-1\\mid${c}]$`,
      `$[1,1\\mid${c}]$`,
    ];
    explanation = `Apply the row replacement to all three entries, including the augmented entry: $[${a}-${a},${a * b + 1}-${a * b}\\mid${a * x + c}-${a * x}]=[0,1\\mid${c}]$.`;
  } else if (kind === "volume-conversion") {
    const litres = x + b / 10;
    prompt = `A cylinder contains ${litres} L. What volume is that in cm³?`;
    values = [litres * 1000, litres * 100, litres, litres * 10_000].map((value) =>
      String(Math.round(value * 10) / 10),
    );
    explanation = `One litre equals 1000 mL and one millilitre equals one cubic centimetre. Multiply by 1000 to get ${values[0]} cm³.`;
  } else if (kind === "density") {
    const mass = a * x * 100;
    prompt = `A sample has a mass of ${mass} g and occupies ${x / 10} L. Calculate its density in g cm⁻³.`;
    values = [a, a / 10, a * 100, a * 1000].map(String);
    explanation = `First convert the volume to ${100 * x} cm³, then divide ${mass} g by that volume to obtain ${a} g cm⁻³.`;
  } else if (kind === "determinant") {
    const c = pick(1, 4);
    let d = pick(6, 10);
    if (a * d === b * c) d++;
    const det = a * d - b * c;
    prompt = `Find $\\det\\begin{bmatrix}${a}&${b}\\\\${c}&${d}\\end{bmatrix}$.`;
    values = [...new Set([det, a * d + b * c, -det, a * d])].map(String);
    for (let v = det + 1; values.length < 4; v++)
      if (!values.includes(String(v))) values.push(String(v));
    explanation = `For a two-by-two matrix, subtract the off-diagonal product from the diagonal product: $${a}(${d})-${b}(${c})=${det}$. The subtraction order matters.`;
  } else {
    const unsupported: never = kind;
    throw Error(`Unregistered concept generator: ${unsupported}`);
  }
  if (new Set(values).size !== 4) throw Error("Non-distinct probe options");
  const correct = values[0],
    shuffled = values
      .map((value) => ({ value, key: pick(0, 1000000) }))
      .sort((a, b) => a.key - b.key);
  const options = shuffled.map((v, i) => ({ id: String.fromCharCode(97 + i), text: v.value }));
  return {
    prompt,
    options,
    correctId: options.find((o) => o.text === correct)!.id,
    explanation,
    itemKey: createHash("sha256").update(prompt).digest("hex"),
  };
}

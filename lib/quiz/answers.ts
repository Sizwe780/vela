import { compareQuizFormulas, type FormulaPair } from "./math-worker";
import type { MathFeedback } from "../math-practice/types";
export type AnswerRules = { kind: "expression"; aliases?: Record<string, string> };
export type AnswerDecision = { status: "correct" | "incorrect" | "unverified"; message: string };
const unverified = (
  message = "This answer needs review rather than a literal-string grade. Define alternate symbols and compare with the reference solution.",
): AnswerDecision => ({ status: "unverified", message });
export function unwrapAnswer(value: string) {
  let s = value.trim().replace(/^`([^`]+)`$/, "$1");
  for (const [a, b] of [
    ["$$", "$$"],
    ["$", "$"],
    ["\\(", "\\)"],
    ["\\[", "\\]"],
  ])
    if (s.startsWith(a) && s.endsWith(b)) s = s.slice(a.length, -b.length).trim();
  return s;
}
const term = (s: string) =>
  unwrapAnswer(s)
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/^[\s"'“”‘’.,!?;:]+|[\s"'“”‘’.,!?;:]+$/g, "")
    .replace(/\s+/g, " ");
const terminology = [
  [
    "fractional uncertainty",
    "relative uncertainty",
    "absolute uncertainty divided by the measured value",
  ],
  ["density", "mass per unit volume"],
  ["period", "time for one complete oscillation", "time for one complete cycle"],
  ["displacement", "change in position"],
  ["speed", "distance travelled per unit time", "distance traveled per unit time"],
];
export const formulaLike = (s: string) =>
  /[=^*/+]|\\(?:frac|pi|Delta|int|lim)\b|[π²³]/.test(s) ||
  /^\s*-?\d+(?:\.\d+)?\s*$/.test(unwrapAnswer(s)) ||
  /^[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?$/.test(unwrapAnswer(s)) ||
  /^\s*[A-Za-z]\s*[-−]\s*[A-Za-z]\s*$/.test(unwrapAnswer(s));
function formula(value: string) {
  return unwrapAnswer(value)
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "\\pi")
    .replace(/[×·]/g, "*")
    .replace(/[−–]/g, "-")
    .replace(/(?<!\\)\bpi\b/g, "\\pi");
}
function assignment(value: string) {
  const pieces = formula(value).split("=");
  if (
    pieces.length > 2 ||
    (pieces.length === 2 && !/^[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?$/.test(pieces[0].trim()))
  )
    throw Error("Unsupported equation");
  return { lhs: pieces.length === 2 ? pieces[0].trim() : "", rhs: pieces.at(-1)!.trim() };
}
function names(value: string) {
  return [
    ...new Set(
      (value.match(/\\[A-Za-z]+|[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?/g) ?? []).filter(
        (x) => !x.startsWith("\\"),
      ),
    ),
  ].sort();
}
function preparePair(
  reference: string,
  candidate: string,
  rules?: AnswerRules,
): FormulaPair | null {
  try {
    const a = assignment(reference),
      b = assignment(candidate);
    if (a.lhs && b.lhs && a.lhs !== b.lhs) return null;
    if (!a.lhs && b.lhs) return null;
    const aliases = rules?.aliases ?? {};
    const replaceAliases = (s: string) =>
      s.replace(
        /\\[A-Za-z]+|[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?/g,
        (token) => aliases[token] ?? token,
      );
    const left = replaceAliases(a.rhs),
      right = replaceAliases(b.rhs);
    // No arbitrary renaming: differing symbols can represent different physical quantities.
    const leftNames = names(left),
      rightNames = names(right);
    const vars = [...new Set([...leftNames, ...rightNames])].sort();
    if (vars.length > 8) return null;
    const slots = ["x", "y", "z", "t", "a", "b", "c", "C"];
    const mapped = (s: string) =>
      s.replace(/\\[A-Za-z]+|[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?/g, (token) =>
        token.startsWith("\\") ? token : slots[vars.indexOf(token)],
      );
    return {
      reference: mapped(left),
      candidate: mapped(right),
      notationUnclear: leftNames.join("|") !== rightNames.join("|"),
    };
  } catch {
    return null;
  }
}
export async function checkShortAnswers(
  items: { prompt: string; accepted: string[]; value: string; rules?: AnswerRules }[],
  compare = compareQuizFormulas,
): Promise<AnswerDecision[]> {
  const pairs: FormulaPair[] = [];
  const plans = items.map((item): AnswerDecision | number[][] => {
    const refs = item.accepted.flatMap((s) => (formulaLike(s) ? s.split(/\s+or\s+/i) : [s]));
    const candidates = item.value.split(/\s+or\s+/i);
    if (candidates.length > 3 || !item.value.trim())
      return unverified("Submit one clear answer, or only equivalent mathematical alternatives.");
    const exact = candidates.every((s) =>
      refs.some((r) =>
        formulaLike(r)
          ? formula(r).replace(/\s+/g, "") === formula(s).replace(/\s+/g, "")
          : term(r) === term(s),
      ),
    );
    if (exact)
      return {
        status: "correct",
        message:
          "Answer matches an accepted reference, ignoring outer math delimiters and presentation.",
      };
    if (!refs.some(formulaLike)) {
      if (
        candidates.length === 1 &&
        terminology.some(
          (set) => refs.some((r) => set.includes(term(r))) && set.includes(term(item.value)),
        )
      )
        return { status: "correct", message: "Accepted equivalent terminology." };
      if (/exact (?:missing |source )?term|complete the statement/i.test(item.prompt))
        return {
          status: "incorrect",
          message: "This item asks for the missing source term. Check its meaning in the passage.",
        };
      return unverified(
        "This conceptual answer needs a reasoning review; a different wording is not automatically incorrect. Use the lesson's Check my attempt or Teach the Tutor for feedback.",
      );
    }
    if (!candidates.every(formulaLike)) return unverified();
    let rules = item.rules;
    // Reviewed scalar-speed notation: d is the travelled distance, w the gate/flag width.
    if (
      !rules &&
      /\bspeed\b/i.test(item.prompt) &&
      !/\bvelocity\b/i.test(item.prompt) &&
      refs.some((r) => /^(?:v\s*=\s*)?w\s*\/\s*t$/.test(unwrapAnswer(r)))
    )
      rules = { kind: "expression", aliases: { d: "w" } };
    return candidates.map((c) =>
      refs.map((r) => {
        const pair = preparePair(r, c, rules);
        if (!pair) return -1;
        pairs.push(pair);
        return pairs.length - 1;
      }),
    );
  });
  const results: MathFeedback[] = pairs.length ? await compare(pairs) : [];
  return plans.map((plan) => {
    if (!Array.isArray(plan)) return plan;
    const states = plan.map((indices) => {
      const checks = indices.map((i) =>
        i < 0 || (pairs[i]?.notationUnclear && results[i]?.status === "not-equivalent")
          ? undefined
          : results[i],
      );
      if (checks.some((c) => c?.status === "equivalent" || c?.status === "conditional"))
        return "correct";
      if (checks.every((c) => c?.status === "not-equivalent")) return "incorrect";
      return "unverified";
    });
    if (states.every((s) => s === "correct"))
      return {
        status: "correct",
        message:
          "Symbolic equivalence checked. Keep the reference's physical assumptions and nonzero denominators; alternative notation must denote the same quantities.",
      };
    if (states.some((s) => s === "incorrect"))
      return {
        status: "incorrect",
        message:
          "The expressions differ algebraically. Check signs, powers and denominators; every alternative you submit must be valid.",
      };
    return unverified(
      "No reliable equivalence verdict was obtained. Different symbols or extra relations need explicit definitions. This item is excluded from the automatic score.",
    );
  });
}

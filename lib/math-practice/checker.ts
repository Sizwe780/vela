import nerdamer from "nerdamer";
import { parseMath, UnsupportedMath, type ParsedMath } from "./parser";
import { checkMatrixStep } from "./matrix";
import { checkQuantity } from "./quantity";
import type { MathCheckRequest, MathFeedback } from "./types";
function numberAt(code: string, values: Record<string, number>) {
  const value = Number(nerdamer(code, values).evaluate().text({ decimal: true }));
  return Number.isFinite(value) && Math.abs(value) < 1e12 ? value : null;
}
async function resolveLimits(parsed: ParsedMath) {
  let code = parsed.code;
  for (const limit of parsed.limits) {
    if (!limit.rational || limit.variables.some((v) => v !== limit.variable))
      throw new UnsupportedMath(
        "This release verifies finite two-sided limits of rational functions in one variable. Other limits need a tutor review.",
      );
    const simplifiedExpression = nerdamer.simplify(limit.body);
    const simplified = simplifiedExpression.toString();
    const reduced = await parseMath(simplifiedExpression.toTeX());
    for (const denominator of reduced.denominators) {
      const atPoint = numberAt(denominator, { [limit.variable]: limit.point });
      if (atPoint === null || Math.abs(atPoint) < 1e-12)
        throw new UnsupportedMath(
          "The reduced rational function has a pole here. No finite two-sided limit was verified.",
        );
    }
    const value = numberAt(simplified, { [limit.variable]: limit.point });
    if (value === null)
      throw new UnsupportedMath(
        "No finite two-sided limit was verified. A pole, one-sided limit or unresolved cancellation needs a separate argument.",
      );
    const exact = nerdamer(simplified, { [limit.variable]: limit.point }).toString();
    code = code.replace(limit.code, `(${exact})`);
  }
  return code;
}
function nonzeroConditions(denominators: string[]) {
  const conditions: string[] = [];
  for (const code of new Set(denominators)) {
    const simplified = nerdamer.simplify(code);
    if (!simplified.variables().length) {
      if (numberAt(code, {}) === 0)
        throw new UnsupportedMath("The expression contains division by zero.");
      continue;
    }
    conditions.push(`${simplified.toTeX()} \\ne 0`);
  }
  return [...new Set(conditions)];
}
export async function checkMathStep(request: MathCheckRequest): Promise<MathFeedback> {
  try {
    if (request.kind === "quantity") return checkQuantity(request.reference, request.next);
    if (request.kind === "matrix")
      return checkMatrixStep(request.reference, request.next, request.operation);
    if (
      request.kind !== "symbolic" ||
      !["expression", "antiderivative", "derivative"].includes(request.mode) ||
      !["x", "y", "z", "t"].includes(request.variable)
    )
      throw new UnsupportedMath("Choose a supported checking mode and variable.");
    const original = await parseMath(request.reference),
      candidate = await parseMath(request.next);
    const reference = await resolveLimits(original),
      next = await resolveLimits(candidate);
    const conditions = nonzeroConditions([...original.denominators, ...candidate.denominators]);
    let left = reference,
      right = next;
    if (request.mode === "antiderivative") {
      if (original.integralCount && !original.integral)
        throw new UnsupportedMath(
          "Use one complete indefinite integral as the reference, or enter just its integrand.",
        );
      if (original.integral && original.integral.variable !== request.variable)
        throw new UnsupportedMath("The selected variable must match the integral's differential.");
      left = original.integral?.body ?? reference;
      right = nerdamer.diff(next, request.variable).toString();
    } else if (request.mode === "derivative")
      left = nerdamer.diff(reference, request.variable).toString();
    const residual = nerdamer.simplify(`(${left})-(${right})`);
    if (residual.toString() === "0") {
      const kind =
        request.mode === "antiderivative"
          ? "The derivative matches the integrand. This is a valid antiderivative, up to a constant on each connected interval."
          : original.limits.length || candidate.limits.length
            ? "The finite two-sided limit values agree. Explain why each rewrite is justified."
            : "The expressions simplify to the same value.";
      return {
        status: conditions.length ? "conditional" : "equivalent",
        message:
          kind +
          (conditions.length
            ? " Keep the listed nonzero conditions; cancellation does not restore excluded inputs."
            : ""),
        conditions,
      };
    }
    // A failed simplification is not proof that two expressions differ. Seek a finite counterexample.
    const names = [...new Set([...original.variables, ...candidate.variables])];
    const points = [-3, -2, -1, 0, 1, 2, 3, 5];
    for (let i = 0; i < points.length; i++) {
      const values = Object.fromEntries(
        names.map((name, j) => [name, points[(i + j * 3) % points.length]]),
      );
      try {
        if (
          [...original.denominators, ...candidate.denominators].some((d) => {
            const v = numberAt(d, values);
            return v === null || Math.abs(v) < 1e-8;
          })
        )
          continue;
        const previous = numberAt(left, values),
          proposed = numberAt(right, values);
        if (
          previous !== null &&
          proposed !== null &&
          Math.abs(previous - proposed) > 1e-6 * Math.max(1, Math.abs(previous), Math.abs(proposed))
        )
          return {
            status: "not-equivalent",
            message:
              request.mode === "antiderivative"
                ? "The proposed line's derivative does not match the integrand. Inspect the residual for a sign or coefficient error."
                : "These lines differ at the displayed test input. Check the signs, coefficients and brackets.",
            residualLatex: residual.toTeX().slice(0, 500),
            counterexample: { values, previous, proposed },
            conditions,
          };
      } catch {
        /* An undefined point is not evidence against equivalence. */
      }
    }
    return {
      status: "unsupported",
      message:
        "No symbolic proof or reliable counterexample was found. This step is unverified, not marked wrong. Try a smaller rewrite or ask your tutor.",
      conditions,
    };
  } catch (e) {
    return {
      status: "unsupported",
      message:
        e instanceof UnsupportedMath
          ? e.message
          : "The local checker could not verify this notation safely. Try a smaller step or ask your tutor.",
    };
  }
}

import nerdamer from "nerdamer";
import { parseMath, UnsupportedMath, type ParsedMath, type DomainCondition } from "./parser";
import { checkMatrixStep } from "./matrix";
import { checkQuantity } from "./quantity";
import type { MathCheckRequest, MathFeedback } from "./types";
const isZero = (value: { toString(): string }) => /^-?0(?:\.0+)?$/.test(value.toString());
function numberAt(code: string, values: Record<string, number>) {
  const value = Number(nerdamer(code, values).evaluate().text({ decimal: true }));
  return Number.isFinite(value) && Math.abs(value) < 1e12 ? value : null;
}
async function resolveLimits(parsed: ParsedMath) {
  let code = parsed.code;
  for (const limit of parsed.limits) {
    if (limit.variables.some((v) => v !== limit.variable))
      throw new UnsupportedMath(
        "Check a finite two-sided limit in one variable. Parameter-dependent limits need a separate argument.",
      );
    for (const condition of limit.domain) {
      if (condition.relation === "ne") continue; // A denominator may vanish at an isolated approach point.
      const value = numberAt(condition.expression, { [limit.variable]: limit.point });
      if (value === null || value <= 0)
        throw new UnsupportedMath(
          "A real-domain boundary occurs at the approach point. Check each one-sided domain separately; no two-sided limit was verified.",
        );
    }
    if (!limit.rational) {
      const left = nerdamer.limit(limit.body, limit.variable, limit.point, "left");
      const right = nerdamer.limit(limit.body, limit.variable, limit.point, "right");
      const a = numberAt(left.toString(), {}),
        b = numberAt(right.toString(), {});
      if (
        left.variables().length ||
        right.variables().length ||
        a === null ||
        b === null ||
        !isZero(nerdamer.simplify(`(${left})-(${right})`))
      )
        throw new UnsupportedMath(
          "The two one-sided limits did not resolve to the same finite real value. A pole, jump or unresolved expression needs a separate argument.",
        );
      code = code.replace(limit.code, `(${left.toString()})`);
      continue;
    }
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
function domainHolds(domain: DomainCondition[], values: Record<string, number>) {
  return domain.every((c) => {
    const value = numberAt(c.expression, values);
    return (
      value !== null &&
      (c.relation === "ne" ? Math.abs(value) > 1e-10 : c.relation === "gt" ? value > 0 : value >= 0)
    );
  });
}
function domainLabels(domain: DomainCondition[]) {
  return domain
    .filter((c) => nerdamer.simplify(c.expression).variables().length > 0)
    .map(
      (c) =>
        `${nerdamer.simplify(c.expression).toTeX()} ${c.relation === "ne" ? "\\ne" : c.relation === "gt" ? ">" : "\\ge"} 0`,
    );
}
function validateDomain(domain: DomainCondition[], needsInterval: boolean) {
  const bounds = new Map<
    string,
    { low: number; high: number; strictLow: boolean; strictHigh: boolean }
  >();
  for (const c of domain) {
    const variables = nerdamer.simplify(c.expression).variables();
    if (!variables.length) {
      if (!domainHolds([c], {}))
        throw new UnsupportedMath("The stated real-domain conditions are empty or undefined.");
      continue;
    }
    if (variables.length !== 1 || c.relation === "ne") continue;
    const variable = variables[0],
      slope = nerdamer.diff(c.expression, variable);
    if (slope.variables().length) continue;
    const coefficient = numberAt(slope.toString(), {}),
      intercept = numberAt(c.expression, { [variable]: 0 });
    if (coefficient === null || !coefficient || intercept === null) continue;
    const value = -intercept / coefficient,
      range = bounds.get(variable) ?? {
        low: -Infinity,
        high: Infinity,
        strictLow: false,
        strictHigh: false,
      };
    if (coefficient > 0 && value >= range.low) {
      range.strictLow =
        value === range.low ? range.strictLow || c.relation === "gt" : c.relation === "gt";
      range.low = value;
    }
    if (coefficient < 0 && value <= range.high) {
      range.strictHigh =
        value === range.high ? range.strictHigh || c.relation === "gt" : c.relation === "gt";
      range.high = value;
    }
    if (
      range.low > range.high ||
      (range.low === range.high && (needsInterval || range.strictLow || range.strictHigh))
    )
      throw new UnsupportedMath(
        "The stated restrictions leave no valid real interval. Check the domain notes before continuing.",
      );
    bounds.set(variable, range);
  }
  // Do not certify an identity on an empty/undefined real domain. A witness establishes
  // non-emptiness only; symbolic simplification, not these samples, must prove equality.
  const names = [...new Set(domain.flatMap((c) => nerdamer.simplify(c.expression).variables()))];
  if (!names.length) return;
  const seed = Object.fromEntries(
    names.map((name) => {
      const range = bounds.get(name);
      const value = !range
        ? 1
        : Number.isFinite(range.low) && Number.isFinite(range.high)
          ? (range.low + range.high) / 2
          : Number.isFinite(range.low)
            ? range.low + Math.max(1, Math.abs(range.low) / 10)
            : Number.isFinite(range.high)
              ? range.high - Math.max(1, Math.abs(range.high) / 10)
              : 1;
      return [name, value];
    }),
  );
  if (domainHolds(domain, seed)) return;
  const points = [1, 2, -1, -2, 0, 3, -3, 5, -5, 10, -10, 100, -100];
  if (
    points.some((_, i) =>
      domainHolds(
        domain,
        Object.fromEntries(names.map((name, j) => [name, points[(i + j * 3) % points.length]])),
      ),
    )
  )
    return;
  throw new UnsupportedMath(
    "No real input satisfying all domain conditions was established. Check the restrictions or work on a smaller stated interval; this is unverified, not marked wrong.",
  );
}
/** d(log|u|)=u'/u on u != 0, separately on each connected real interval. */
function derivativeInput(code: string): string {
  let start = 0;
  while ((start = code.indexOf("log(abs(", start)) >= 0) {
    let depth = 1,
      end = start + 8;
    for (; end < code.length && depth; end++) {
      if (code[end] === "(") depth++;
      if (code[end] === ")") depth--;
    }
    if (code[end] !== ")") break;
    code =
      code.slice(0, start) + "log(" + code.slice(start + 8, end - 1) + ")" + code.slice(end + 1);
    start += 4;
  }
  return code;
}
function applyDomainSigns(code: string, domain: DomainCondition[]): string {
  // Only use explicit sign facts, never sqrt(u^2)=u without them.
  return code.replace(/abs\(([^()]+)\)/g, (match, argument) => {
    for (const c of domain.filter((c) => c.relation !== "ne")) {
      if (nerdamer.simplify(`(${c.expression})-(${argument})`).toString() === "0")
        return `(${argument})`;
      if (nerdamer.simplify(`(${c.expression})+(${argument})`).toString() === "0")
        return `(-(${argument}))`;
    }
    return match;
  });
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
    if (
      request.domainSources &&
      (!Array.isArray(request.domainSources) || request.domainSources.length > 64)
    )
      throw new UnsupportedMath(
        "Save this working and start a fresh check after 64 accepted lines.",
      );
    const prior = await Promise.all(
      [...new Set(request.domainSources ?? [])]
        .filter((line) => line !== request.reference && line !== request.next)
        .map(parseMath),
    );
    const reference = await resolveLimits(original),
      next = await resolveLimits(candidate);
    const domain = [
      ...original.domain,
      ...candidate.domain,
      ...prior.flatMap((p) => p.domain),
      ...[
        ...original.denominators,
        ...candidate.denominators,
        ...prior.flatMap((p) => p.denominators),
      ].map((expression) => ({
        expression,
        relation: "ne" as const,
      })),
    ];
    if (request.mode !== "expression")
      for (const c of domain) {
        if (c.relation === "ge") c.relation = "gt";
      }
    validateDomain(domain, request.mode !== "expression");
    const conditions = [
      ...new Set([
        ...nonzeroConditions([...original.denominators, ...candidate.denominators]),
        ...domainLabels(domain),
      ]),
    ];
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
      right = nerdamer.diff(derivativeInput(next), request.variable).toString();
    } else if (request.mode === "derivative")
      left = nerdamer.diff(derivativeInput(reference), request.variable).toString();
    for (const condition of domain) {
      if (
        !nerdamer.simplify(condition.expression).variables().length &&
        !domainHolds([condition], {})
      )
        throw new UnsupportedMath(
          "The stated real-domain conditions are empty or undefined. Check the logarithm, root or restriction.",
        );
    }
    left = applyDomainSigns(nerdamer.simplify(left).toString(), domain);
    right = applyDomainSigns(nerdamer.simplify(right).toString(), domain);
    let residual = nerdamer.simplify(`(${left})-(${right})`);
    if (!isZero(residual) && /(?:sin|cos)\(-?\d+\*[xyzt]\)/.test(left + right)) {
      residual = nerdamer.simplify(`(${expandDoubleAngles(left)})-(${expandDoubleAngles(right)})`);
    }
    if (isZero(residual)) {
      const kind =
        request.mode === "antiderivative"
          ? "The derivative matches the integrand. This is a valid antiderivative, up to a constant on each connected interval."
          : original.limits.length || candidate.limits.length
            ? "The finite two-sided limit values agree. A removable hole stays excluded from the original function; a limit does not fill it. Explain why each rewrite is justified."
            : "The expressions simplify to the same value.";
      return {
        status: conditions.length ? "conditional" : "equivalent",
        message:
          kind +
          (conditions.length
            ? " Verified on the listed real-domain conditions only; cancellation does not restore excluded inputs."
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
        if (!domainHolds(domain, values)) continue;
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
                : request.mode === "expression" &&
                    original.limits.length > 0 &&
                    candidate.limits.length === 0 &&
                    candidate.variables.length > 0
                  ? "The starting limit evaluates to a constant, but your line still contains a variable. Did you drop the limit operator? Keep it attached until you evaluate the limit."
                  : "These lines differ at the displayed test input. Compare their values before inspecting the algebra.",
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

/** Exact double-angle identities, not numeric sampling as a proof. */
function expandDoubleAngles(code: string) {
  return code.replace(/(sin|cos)\((-?\d+)\*([xyzt])\)/g, (match, fn, k, variable) => {
    if (Number(k) % 2) return match;
    const argument = `(${Number(k) / 2}*${variable})`;
    return fn === "sin"
      ? `(2*sin(${argument})*cos(${argument}))`
      : `(cos(${argument})^2-sin(${argument})^2)`;
  });
}

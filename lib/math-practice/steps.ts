import type { MathCheckRequest, SymbolicMode } from "./types";
/** Algebra follows the last accepted line. Primitive checks stay anchored to the integrand. */
export function symbolicStep(
  reference: string,
  next: string,
  mode: SymbolicMode,
  variable: "x" | "y" | "z" | "t",
  accepted: string[],
): MathCheckRequest {
  const previous = accepted.at(-1);
  return {
    kind: "symbolic",
    reference: mode === "antiderivative" ? reference : (previous ?? reference),
    next,
    mode: mode === "derivative" && previous ? "expression" : mode,
    variable,
    domainSources: [reference, ...accepted],
  };
}

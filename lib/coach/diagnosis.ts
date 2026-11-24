import type { Diagnosis, WorkStep } from "./types";
import type { ServerStepCheck } from "./server-cas";
export function groundDiagnosis(
  diagnosis: Diagnosis,
  steps: Pick<WorkStep, "latex">[],
  checks: ServerStepCheck[],
): Diagnosis {
  const mismatches = checks.filter((c) => c.result.status === "not-equivalent");
  const leadingMinus = (number: number) =>
    /^\s*-\s*(?:\\left\s*)?[({]/.test(steps[number - 2]?.latex ?? "");
  return {
    ...diagnosis,
    ...(mismatches.length
      ? {
          summary: `The first algebraically verified mismatch is at step ${mismatches[0].number}. Revisit that line before relying on later steps.`,
          nextQuestion: leadingMinus(mismatches[0].number)
            ? "What happens to each sign when every term in the bracket is multiplied by -1? Rewrite just that step."
            : "Which term accounts for the counterexample? Try one smaller, justified rewrite.",
        }
      : {}),
    steps: diagnosis.steps.map((step) => {
      const checked = checks.find((c) => c.number === step.number);
      if (checked?.result.status === "conditional")
        return {
          ...step,
          feedback: `The expressions agree under these conditions: ${checked.result.conditions?.map((c) => `$${c}$`).join(", ")}. Cancellation does not restore excluded inputs. Written reasoning still needs a separate review.`,
          hint: "Keep the domain conditions visible and explain why the rewrite is justified.",
        };
      if (checked?.result.status !== "not-equivalent") return step;
      const point = checked.result.counterexample;
      let feedback = "This line is not equivalent to the expression being checked.";
      if (point) {
        const values = Object.entries(point.values)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        feedback += ` ${values ? `At ${values}, ` : "Numerically, "}the checked expression has value ${point.previous.toPrecision(8)}, while this line gives ${point.proposed.toPrecision(8)}${/derivative/.test(checked.result.message) ? " after differentiation" : ""}.`;
      }
      return {
        ...step,
        status: "revisit" as const,
        feedback,
        hint: leadingMinus(step.number)
          ? "Treat the leading minus as multiplication by -1. Apply it to every term inside the brackets. What sign should the constant have?"
          : "Compare the signs, coefficients and brackets. Rewrite just one term at a time, and use the displayed counterexample to locate the mismatch.",
      };
    }),
  };
}

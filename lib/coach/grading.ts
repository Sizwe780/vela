import type { ConceptualGrade } from "./types";
const normalize = (s: string) =>
  s.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
export function scoreConceptualGrade(
  grade: ConceptualGrade,
  explanation: string,
  reference: string,
) {
  const learner = normalize(explanation),
    source = normalize(reference);
  const quoted = (quote: string, body: string) =>
    quote.trim().length >= 8 && body.includes(normalize(quote));
  const verified =
    grade.supported &&
    grade.confidence === "high" &&
    grade.facets.filter((f) => quoted(f.learnerQuote, learner) && quoted(f.referenceQuote, source))
      .length >= 2 &&
    grade.facets.every(
      (f) => f.score === 0 || (quoted(f.learnerQuote, learner) && quoted(f.referenceQuote, source)),
    ) &&
    grade.misconceptions.every((m) => quoted(m.quote, learner) && quoted(m.referenceQuote, source));
  const byId = Object.fromEntries(grade.facets.map((f) => [f.id, f.score]));
  let score = (2 * byId.correctness + 2 * byId.reasoning + byId.clarity + byId.example) / 6;
  // Fluency and a pleasant analogy cannot compensate for a false central explanation.
  score = Math.min(score, byId.correctness < 0.5 ? 0.25 : 1, byId.reasoning < 0.5 ? 0.5 : 1);
  return { verified, score: verified ? Math.round(score * 100) / 100 : 0 };
}
export const conceptRubric = [
  { id: "correctness", label: "Conceptual accuracy" },
  { id: "reasoning", label: "Why the idea works" },
  { id: "clarity", label: "Accessible explanation" },
  { id: "example", label: "Original example and conditions" },
] as const;

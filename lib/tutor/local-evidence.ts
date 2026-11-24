import { mathSpans, normalizeMath } from "../content/math";
// Whole syntax-checked paragraphs only: never cut an equation to satisfy a local context budget.
export function compactTutorEvidence(
  query: string,
  sources: { title: string; body: string }[],
  budget = 2800,
) {
  const terms = new Set(query.toLowerCase().match(/[a-z]{4,}/g) ?? []);
  let used = 0;
  const selected = sources
    .flatMap((source, sourceIndex) =>
      source.body.split(/\n\s*\n/).map((body, index) => ({
        title: source.title,
        body: normalizeMath(body),
        sourceIndex,
        index,
        score: [...terms].filter((t) => body.toLowerCase().includes(t)).length,
      })),
    )
    .filter((p) => {
      try {
        mathSpans(p.body);
        return p.body.length >= 15 && p.body.length <= budget;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex || a.index - b.index)
    .filter((p) => {
      const size = JSON.stringify({ title: p.title, text: p.body }).length + 2;
      if (used + size > budget) return false;
      used += size;
      return true;
    })
    .sort((a, b) => a.sourceIndex - b.sourceIndex || a.index - b.index);
  return JSON.stringify(selected.map((p) => ({ title: p.title, text: p.body })));
}

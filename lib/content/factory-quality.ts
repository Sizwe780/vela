import type { EffectiveSpec, SpecUnit } from "../specs";
import { auditUnit } from "../specs";
import { visualPresetIds } from "./visual-presets";
import { validateSessionMarkdown } from "./session-schema";

function words(text: string) {
  return (
    text
      .replace(/\$\$[\s\S]*?\$\$|\$[^\n$]+\$|^:::.*$/gm, " ")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function windows(tokens: string[], size: number): string[] {
  return Array.from({ length: Math.max(0, tokens.length - size + 1) }, (_, index) =>
    tokens.slice(index, index + size).join(" "),
  );
}

function paragraphSimilarity(left: string, right: string): number {
  // Compare token edit distance. Paragraphs are already length- and n-gram-filtered.
  const a = left.split(" ");
  const b = right.split(" ");
  let prior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(row[j - 1] + 1, prior[j] + 1, prior[j - 1] + Number(a[i - 1] !== b[j - 1]));
    prior = row;
  }
  return 1 - prior[b.length] / Math.max(a.length, b.length);
}

export function sourceOverlap(lesson: string, corpus: readonly string[]) {
  const index = new Map<string, Set<string>>();
  const bigrams = new Set<string>();
  for (const source of corpus) {
    for (const entry of source
      .split(/\n\s*\n/)
      .flatMap((part) => {
        const tokens = words(part);
        return Array.from({ length: Math.ceil(tokens.length / 120) }, (_, i) =>
          tokens.slice(i * 120, i * 120 + 120),
        );
      })
      .filter((tokens) => tokens.length >= 16)) {
      for (const gram of new Set(windows(entry, 3))) {
        bigrams.add(gram);
        const examples = index.get(gram) ?? new Set<string>();
        examples.add(entry.join(" "));
        index.set(gram, examples);
      }
    }
  }
  const terms = windows(words(lesson), 3);
  const coverage = terms.filter((gram) => bigrams.has(gram)).length / Math.max(1, terms.length);
  let nearCopy = 0;
  for (const paragraph of lesson.split(/\n\s*\n/)) {
    const tokens = words(paragraph);
    if (tokens.length < 16 || tokens.length > 120) continue;
    const candidates = new Map<string, number>();
    const grams = new Set(windows(tokens, 3));
    for (const key of grams)
      for (const hit of index.get(key) ?? []) candidates.set(hit, (candidates.get(hit) ?? 0) + 1);
    for (const [candidate, count] of candidates) {
      if (count / grams.size < 0.25) continue;
      nearCopy = Math.max(nearCopy, paragraphSimilarity(tokens.join(" "), candidate));
    }
  }
  return { coverage, nearCopy };
}

export function runFactoryAudit(spec: EffectiveSpec, unit: SpecUnit, corpus: readonly string[]) {
  const audit = auditUnit(spec, unit, {
    sourceProse: corpus,
    allowedVisuals: visualPresetIds,
    requireSourceAudit: true,
  });
  const science = spec.domains.some((domain) => domain === "chemistry" || domain === "physics");
  for (const session of unit.sessions) {
    try {
      validateSessionMarkdown(session.markdown);
      if (
        /(?<![\\\p{L}])(?:ce|mathrm|frac|sqrt)\s*\{/u.test(
          session.markdown.replace(/\x60[\s\S]*?\x60/g, ""),
        )
      )
        throw new Error("A math or chemistry command appears without its backslash.");
    } catch (error) {
      audit.issues.push({
        code: "FACTORY_RENDER",
        severity: "error",
        session: session.title,
        message: (error as Error).message,
      });
    }
    const overlap = sourceOverlap(session.markdown, corpus);
    if (overlap.coverage >= 0.25 || overlap.nearCopy >= 0.25)
      audit.issues.push({
        code: "FACTORY_OVERLAP",
        severity: "error",
        session: session.title,
        message:
          "Detected substantial trigram overlap or paragraph-level edit similarity. Rewrite before review.",
      });
    if (
      science &&
      /\b(?:density|mass|speed|velocity|temperature|pressure|volume|energy)\s+(?:is|of|=)\s+\$?[-+−]?\d+(?:\.\d+)?(?:e[-+]?\d+)?\$?(?=[.,;](?:\s|$)|\s*$)/im.test(
        session.markdown,
      )
    )
      audit.issues.push({
        code: "FACTORY_BARE_QUANTITY",
        severity: "warning",
        session: session.title,
        message:
          "A measurement may be missing its unit. Confirm its stated magnitude and SI dimension.",
      });
  }
  audit.checks.push(
    "factory-widget-and-math",
    "factory-three-word-overlap",
    "factory-paragraph-edit-similarity",
  );
  if (science) audit.checks.push("factory-science-unit-screen");
  audit.passed = !audit.issues.some((issue) => issue.severity === "error");
  return audit;
}

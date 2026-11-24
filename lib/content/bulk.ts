import { structuredDocumentSchema, type StructuredDocument } from "./structured";
import { mathSpans, normalizeMath } from "./math";

export type PageJob = { key: string; source: string; sha256: string; page: number; unitCode: string; rawText: string };
export type ScopePlan = { files: { id: string; sha256: string }[]; documents: { sourceId: string; sha256: string; unitCode: string; pdfStart: number; pdfEnd: number; text: string; pages: { pdfPage: number; byteStart: number; byteEnd: number }[] }[] };
export function pageJobs(plan: ScopePlan): PageJob[] {
  const pages = new Map<string, PageJob>();
  for (const document of plan.documents) {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(document.sourceId) || !/^[a-f0-9]{64}$/.test(document.sha256)) throw new Error("Invalid source manifest");
    const declared = plan.files.find(file => file.id === document.sourceId);
    if (declared && declared.sha256 !== document.sha256) throw new Error("Page source hash differs from source manifest");
    for (let page = document.pdfStart; page <= document.pdfEnd; page++) {
      const key = `${document.sourceId}:${page}`;
      const prior = pages.get(key);
      if (prior && prior.unitCode !== document.unitCode) throw new Error(`Conflicting unit mapping for ${key}`);
      const span = document.pages.find(span => span.pdfPage === page);
      pages.set(key, { key, source: document.sourceId as PageJob["source"], sha256: document.sha256, page, unitCode: document.unitCode, rawText: span ? Buffer.from(document.text).subarray(span.byteStart, span.byteEnd).toString("utf8") : "" });
    }
  }
  // Guide first, interleaving all units so everyone receives usable readings early.
  const result: PageJob[] = [];
  for (const source of [...new Set(["guide", "stewart",...plan.documents.map(d=>d.sourceId)])]) {
    const groups = [...new Set([...pages.values()].map(page => page.unitCode))].sort().map(unit => [...pages.values()].filter(page => page.source === source && page.unitCode === unit).sort((a, b) => a.page - b.page));
    for (let index = 0; groups.some(group => index < group.length); index++) for (const group of groups) if (group[index]) result.push(group[index]);
  }
  return result;
}

export function validatePage(markdown: string, rawText: string, figureCount: number) {
  const normalized = normalizeMath(markdown);
  if (normalized.length > 60_000 || (normalized.trim().length < 20 && !figureCount)) throw new Error("Empty or oversized OCR page");
  const spans = mathSpans(normalized);
  const rawLetters = rawText.replace(/[^\p{L}]/gu, "").length;
  const letters = normalized.replace(/[^\p{L}]/gu, "").length;
  if (rawLetters > 500 && letters < rawLetters * 0.3) throw new Error("OCR omitted most of the page text");
  const lines = normalized.split("\n").map(line => line.trim()).filter(line => line.length > 45);
  const repetitions = new Map<string, number>();
  for (const line of lines) { const count = (repetitions.get(line) ?? 0) + 1; repetitions.set(line, count); if (count > 8) throw new Error("OCR contains a repeated-text loop"); }
  if ((rawText.match(/∫|∑|√|∞|\\frac|\blim\b|\bf\s*\(x\)/g)?.length ?? 0) > 4 && !spans.length) throw new Error("Mathematical source produced no delimited formulas");
  checkLimitTables(normalized);
  return { markdown: normalized, formulas: spans.length };
}

// Deterministic consistency check for a common calculus table form. It does
// not rewrite the source or claim to verify arbitrary mathematical content.
export function checkLimitTables(markdown: string) {
  let formula: { numerator: number; denominator: number } | undefined;
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|")) { formula = undefined; continue; }
    const match = /\\frac\{x\^2\s*-\s*(\d+(?:\.\d+)?)\}\{x\s*-\s*(\d+(?:\.\d+)?)\}/.exec(line);
    if (match) { formula = { numerator: Number(match[1]), denominator: Number(match[2]) }; continue; }
    if (!formula || /^\s*\|[-\s:|]+$/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim().replace(/\$/g, "").replace(/,/g, "").replace(/−/g, "-"));
    if (cells.length < 2 || !cells.slice(0, 2).every(cell => /^[-+]?\d+(?:\.\d+)?$/.test(cell))) continue;
    const [x, value] = cells.map(Number);
    if (x === formula.denominator) continue;
    const expected = (x * x - formula.numerator) / (x - formula.denominator);
    const precision = cells[1].split(".")[1]?.length ?? 0;
    const tolerance = 0.51 * 10 ** -precision + Math.abs(expected) * 1e-8;
    if (Math.abs(value - expected) > tolerance) throw new Error(`Limit table is numerically inconsistent at x=${x}; retry OCR or compare the original PDF`);
  }
}

export function pageDocument(job: PageJob, dpi: number, blocks: StructuredDocument["blocks"]) {
  return structuredDocumentSchema.parse({ version: 1, parser: { name: "marker", version: "2.1.0", review: "machine", profile: `bulk-v1;dpi=${dpi};surya=0.23.0` }, source: { document: job.source, sha256: job.sha256, pageStart: job.page, pageEnd: job.page }, blocks });
}

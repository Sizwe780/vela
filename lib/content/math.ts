import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import { katex, katexOptions } from "./katex";

type Node = { type: string; value?: string; children?: Node[]; position?: { start: { offset?: number }; end: { offset?: number } } };
export { normalizeMath } from "./normalize-math";
export function mathSpans(markdown: string): { start: number; end: number }[] {
  const tree = unified().use(remarkParse).use(remarkMath).parse(markdown) as Node;
  const spans: { start: number; end: number }[] = [];
  const visit = (node: Node) => {
    if (node.type === "math" || node.type === "inlineMath") {
      const value = node.value ?? "";
      const start = node.position!.start.offset!;
      const end = node.position!.end.offset!;
      if (/[\x00-\x09\x0b\x0c\x0e-\x1f]|\r(?!\n)/.test(markdown.slice(start, end))) {
        throw new Error("A formula contains a control character. Check the LaTeX backslash escapes.");
      }
      if (value.length > 12_000 || /\\(?:href|url|includegraphics|html\w*|def|gdef|newcommand|renewcommand|require)\b/.test(value)) throw new Error("Unsupported or oversized mathematical expression");
      if (/(?<![\\a-zA-Z])(?:mathrm|ce|text|frac|sqrt)\s*\{/.test(value)) {
        throw new Error("A mathematical or chemical command is missing its LaTeX backslash.");
      }
      katex.renderToString(value, { ...katexOptions, displayMode: node.type === "math", throwOnError: true });
      spans.push({ start, end });
    } else if (node.type === "text") {
      const raw = markdown.slice(node.position!.start.offset!, node.position!.end.offset!);
      if (/(?<!\\)\$/.test(raw)) throw new Error("Unmatched math delimiter; escape currency as \\$");
      if (/\\(?:frac|lim|sqrt|ce|begin|end|sum|int|to|alpha|beta|infty)\b/.test(raw)) throw new Error("TeX commands must be inside math delimiters");
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  // remark accepts a display block ending at EOF; require an explicit closer.
  for (const span of spans) {
    const raw = markdown.slice(span.start, span.end).trim();
    const opening = raw.match(/^\$+/)?.[0] ?? "";
    if (opening.length > 1 && !raw.slice(opening.length).trimEnd().endsWith(opening)) throw new Error("Unclosed display math block");
  }
  return spans;
}

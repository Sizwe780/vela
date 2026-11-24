import { mathSpans } from "./math";

export function validateFactoryMath(markdown: string) {
  mathSpans(markdown);
  const printable = markdown.replace(
    /^\s*(?:\x60{3,}|~{3,}).*[\s\S]*?^\s*(?:\x60{3,}|~{3,})[ \t]*$|\x60[^\x60\n]*\x60/gm,
    "",
  );
  if (/(?<![\\\p{L}])(?:ce|mathrm|frac|sqrt)\s*\{|\bce(?=[A-Z][a-z]?\d)/u.test(printable))
    throw new Error("A math or chemistry command appears without its backslash.");
}

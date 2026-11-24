// Formatting/navigation commands have no place in a student expression editor.
export function unsafeMathFormatting(latex: string) {
  return /\\(?:href|url|html[A-Za-z]*|class|cssId|style|includegraphics|def|gdef|newcommand|renewcommand|require|input|catcode|write)\b/i.test(
    latex,
  );
}

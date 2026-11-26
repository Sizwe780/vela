/** Preserve source notation when a complete rendered equation is copied. */
export function selectedMathText(selection: Selection | null): string | null {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return null;
  const fragment = selection.getRangeAt(0).cloneContents();
  const equations = [...fragment.querySelectorAll(".katex")];
  if (!equations.length) return null;
  for (const equation of equations) {
    const source = equation.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    if (!source) return null; // Partial selection: retain native copying rather than guessing.
    const display = equation.parentElement?.classList.contains("katex-display");
    equation.replaceWith(
      fragment.ownerDocument.createTextNode(display ? `\n$$\n${source}\n$$\n` : `$${source}$`),
    );
  }
  for (const block of fragment.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,tr,blockquote"))
    block.after(fragment.ownerDocument.createTextNode("\n"));
  for (const br of fragment.querySelectorAll("br"))
    br.replaceWith(fragment.ownerDocument.createTextNode("\n"));
  return fragment.textContent;
}

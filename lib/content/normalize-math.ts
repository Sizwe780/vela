export function normalizeMath(markdown: string): string {
  return markdown.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => index % 2 ? part : part
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([^\n]*?)\\\)/g, (_, math) => `$${math}$`)
    .replace(/\\(csch|sech)\b/g, (_, name) => `\\operatorname{${name}}`)
    .replace(/(?<!\\)\$\$([\s\S]*?)(?<!\\)\$\$/g, (original, math) =>
      !(math.startsWith("\n") && math.endsWith("\n")) ? `\n$$\n${math.trim()}\n$$\n` : original)).join("");
}

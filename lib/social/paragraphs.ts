import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { parseLearningBlocks } from "../content/exercises";
import { normalizeParagraph } from "./text";
export const sourceDigest = (value: string) => createHash("sha256").update(value).digest("hex");
export function discussionParagraphs(markdown: string, revision: string) {
  const parsed = parseLearningBlocks(markdown);
  if (parsed.errors.length) return [];
  const hash = sourceDigest(revision + "\n" + markdown),
    seen = new Set<string>(),
    paragraphs: { anchor: string; text: string }[] = [];
  for (const block of parsed.blocks) {
    const text = block.type === "text" ? block.text : block.question;
    const tree = unified().use(remarkParse).parse(text);
    const visit = (node: {
      type: string;
      position?: { start: { offset?: number }; end: { offset?: number } };
      children?: unknown[];
    }) => {
      if (node.type === "paragraph" && node.position) {
        const raw = normalizeParagraph(
          text.slice(node.position.start.offset, node.position.end.offset),
        );
        if (raw.length >= 20 && raw.length <= 2000 && !seen.has(raw)) {
          seen.add(raw);
          paragraphs.push({ anchor: sourceDigest(hash + "\n" + raw), text: raw });
        }
      } else for (const child of node.children ?? []) visit(child as Parameters<typeof visit>[0]);
    };
    visit(tree);
  }
  return paragraphs.slice(0, 200);
}

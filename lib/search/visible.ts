import { parseLearningBlocks } from "../content/exercises";
import { parseWidgetBlocks } from "../content/widget-registry";
/** Search includes teaching and questions, never gated solutions. */
export function visibleStudyText(markdown: string) {
  const parsed = parseLearningBlocks(markdown);
  if (parsed.errors.length) return "";
  return parsed.blocks
    .map((b) =>
      b.type === "text"
        ? parseWidgetBlocks(b.text)
            .blocks.filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n")
        : b.question,
    )
    .join("\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#$*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export type SearchDocument = {
  id: string;
  title: string;
  unitId: string;
  unitTitle: string;
  moduleCode: string;
  visible: string;
};
export function searchStudyDocuments(documents: SearchDocument[], query: string) {
  const terms = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
  if (!terms.length) return [];
  return documents
    .flatMap((d) => {
      const title = `${d.moduleCode} ${d.unitTitle} ${d.title}`.toLocaleLowerCase();
      const text = d.visible.toLocaleLowerCase();
      if (!terms.every((t) => title.includes(t) || text.includes(t))) return [];
      const score = terms.reduce((n, t) => n + (title.includes(t) ? 4 : 1), 0);
      const position = Math.max(
        0,
        Math.min(...terms.map((t) => text.indexOf(t)).filter((i) => i >= 0)),
      );
      const start = Number.isFinite(position) ? Math.max(0, position - 60) : 0;
      return [
        {
          id: d.id,
          title: d.title,
          unitId: d.unitId,
          unitTitle: d.unitTitle,
          moduleCode: d.moduleCode,
          excerpt: d.visible.slice(start, start + 240),
          score,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 30);
}

import type { StudyUnitView } from "../tutor/types";
export function deduplicateReadings(documents: StudyUnitView["documents"]) {
  const map = new Map<string, StudyUnitView["documents"][number]>();
  for (const document of documents) {
    const key = JSON.stringify([document.title, document.text]);
    const prior = map.get(key);
    if (prior) prior.ingestionIds!.push(document.id);
    else map.set(key, { ...document, ingestionIds: [document.id] });
  }
  return [...map.values()].sort((a, b) => {
    const category = (document: typeof a) =>
      document.structuredContent?.parser.name === "reviewed-transcription"
        ? 0
        : document.structuredContent
          ? 1
          : 2;
    if (category(a) !== category(b)) return category(a) - category(b);
    const sa = a.structuredContent?.source,
      sb = b.structuredContent?.source;
    if (sa && sb)
      return (
        (sa.document === "guide" ? 0 : 1) - (sb.document === "guide" ? 0 : 1) ||
        sa.pageStart - sb.pageStart
      );
    return a.title.localeCompare(b.title, "en", { numeric: true });
  });
}

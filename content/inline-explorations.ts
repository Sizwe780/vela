import { widgetDirective, type LessonWidget } from "../lib/content/widget-registry";

export function addInlineExplorations<
  T extends { sessions: readonly { title: string; markdown: string }[] },
>(unit: T, byTitle: Readonly<Record<string, LessonWidget>>) {
  return {
    ...unit,
    sessions: unit.sessions.map((session) => {
      const widget = byTitle[session.title];
      if (!widget) return session;
      const text = session.markdown;
      const currentSection = /^## Visual exploration[^\n]*\n[\s\S]*?(?=^## |$(?![\s\S]))/m.exec(
        text,
      );
      const directive = widgetDirective(widget);
      if (currentSection) {
        const end = currentSection.index + currentSection[0].length;
        return {
          ...session,
          markdown: text.slice(0, end).trimEnd() + "\n\n" + directive + "\n\n" + text.slice(end),
        };
      }
      const beforePractice =
        /^#{2,3} (?:Procedure|Assessment|Original worked example|Pause and Predict)\b/m.exec(text);
      if (!beforePractice) throw Error(`Missing teaching boundary for ${session.title}`);
      const position = beforePractice.index;
      return {
        ...session,
        markdown:
          text.slice(0, position).trimEnd() +
          "\n\n## Visual exploration\n\n" +
          directive +
          "\n\n" +
          text.slice(position),
      };
    }),
  };
}

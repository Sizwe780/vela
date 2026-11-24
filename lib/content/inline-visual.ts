import { parseLearningBlocks } from "./exercises";
import { parseWidgetBlocks, widgetDirective, type LessonWidget } from "./widget-registry";
import { visualPresetIds } from "./visual-presets";

export function insertInlineVisual(markdown: string, directive: string) {
  const section = /^## (?:Visual exploration|Visual \/ interactive)[^\n]*\n[\s\S]*?(?=^## |$(?![\s\S]))/im.exec(markdown);
  const position = section
    ? section.index + section[0].length
    : markdown.search(/^#{2,3} (?:Procedure|Assessment|Original worked example|Pause and Predict)\b|^:::exercise\b/m);
  const at = position < 0 ? markdown.length : position;
  const heading = section ? "" : "## Visual exploration\n\n";
  return `${markdown.slice(0, at).trimEnd()}\n\n${heading}${directive}\n\n${markdown.slice(at)}`.trimEnd();
}

export function inlineSessionVisual(markdown: string, visual?: string | null) {
  const model = visualPresetIds.find((id) => id === visual);
  if (!model) return markdown;
  const lesson = parseLearningBlocks(markdown);
  if (lesson.errors.length || lesson.blocks.some((part) => part.type === "text" && parseWidgetBlocks(part.text).blocks.some((block) => block.type === "widget"))) return markdown;
  const widget: LessonWidget = { type: "lesson_preset", config: { model } };
  return insertInlineVisual(markdown, widgetDirective(widget));
}

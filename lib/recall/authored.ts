import { parseLearningBlocks, type LearningBlock } from "../content/exercises";

const levels = { recognition: 1, procedure: 3, "error correction": 2, transfer: 4 } as const;

export function selectRecallExercise(markdown: string) {
  const { blocks, errors } = parseLearningBlocks(markdown);
  if (errors.length) return;
  let selected: Extract<LearningBlock, { type: "exercise" }> | undefined;
  let priority = -1;
  let current = 0;
  for (const block of blocks) {
    if (block.type === "text") {
      const heading = [...block.text.matchAll(/^#{1,6}\s+(.+)$/gm)]
        .at(-1)?.[1]
        .trim()
        .toLowerCase();
      if (heading)
        current = Object.hasOwn(levels, heading) ? levels[heading as keyof typeof levels] : 0;
    } else if (current > priority) {
      selected = block;
      priority = current;
    }
  }
  return selected;
}

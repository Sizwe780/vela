export const editableSections = [
  "Intuition first",
  "Why this works",
  "Interpretation",
  "Application",
] as const;
export type EditableSection = (typeof editableSections)[number];

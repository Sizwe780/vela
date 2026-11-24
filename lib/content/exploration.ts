export type ExplorationStage = {
  label: string;
  rows: readonly (readonly string[])[];
  interpretation: string;
  focus?: number;
  plot?: {
    points: readonly [label: string, x: number, y: number][];
    segments: readonly [from: number, to: number][];
  };
};

export type Exploration = {
  title: string;
  prompt: string;
  columns: readonly string[];
  stages: readonly ExplorationStage[];
  comparison?: { column: number; max: number; unit: string };
};

export function exploration(
  title: string,
  prompt: string,
  columns: readonly string[],
  frames: readonly [label: string, rows: string, interpretation: string, focus?: number][],
): Exploration {
  return {
    title,
    prompt,
    columns,
    stages: frames.map(([label, rows, interpretation, focus]) => ({
      label,
      rows: rows.split("\n").map((row) => row.split("|")),
      interpretation,
      focus,
    })),
  };
}

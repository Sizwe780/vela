"use client";

import { useState } from "react";

export type VisualCheckPrompt = {
  question: string;
  options: readonly string[];
  answer: number;
  feedback: string;
};

export function VisualCheck({ check }: { check: VisualCheckPrompt }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <fieldset className="visual-check">
      <legend>Pause and check</legend>
      <p>{check.question}</p>
      <div className="sandbox-tabs">
        {check.options.map((option, index) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            {option}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p role="status">
          {selected === check.answer
            ? check.feedback
            : "Try again. Revisit the model and compare the relevant cases."}
        </p>
      )}
    </fieldset>
  );
}

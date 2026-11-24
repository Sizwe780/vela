"use client";
import { useState } from "react";
import { MathLabLoader } from "./math-lab-loader";
export function ExerciseScratchpad({ question }: { question: string }) {
  const [open, setOpen] = useState(false);
  const expression =
    question.match(/\$\$([\s\S]+?)\$\$/)?.[1]?.trim() ??
    question.match(/(?<!\$)\$([^$\n]+)\$(?!\$)/)?.[1]?.trim() ??
    "";
  if (!expression) return null;
  return (
    <div className="exercise-scratchpad">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Close scratchpad" : "Try in math scratchpad"}
      </button>
      {open && <MathLabLoader initialReference={expression} question={question} />}
    </div>
  );
}

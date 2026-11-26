"use client";
import { useId } from "react";
import type { TutorPace } from "../../lib/tutor/types";
const choices = [
  {
    value: "normal" as const,
    label: "Normal",
    description: "Clear, direct help with your current question",
  },
  {
    value: "transfer" as const,
    label: "Deep transfer",
    description: "One question at a time, then apply the idea in a new context",
  },
];
export function TutorPacing({
  value,
  disabled,
  onChange,
}: {
  value: TutorPace;
  disabled: boolean;
  onChange: (pace: TutorPace) => void;
}) {
  const help = useId();
  return (
    <div className="tutor-pacing-control">
      <div
        className="tutor-pacing-segments"
        role="radiogroup"
        aria-label="Tutor pacing"
        aria-describedby={help}
      >
        {choices.map((choice, index) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={value === choice.value}
            tabIndex={value === choice.value ? 0 : -1}
            disabled={disabled}
            title={choice.description}
            onClick={() => onChange(choice.value)}
            onKeyDown={(event) => {
              if (
                disabled ||
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? choices.length - 1
                    : (index + 1) % choices.length;
              onChange(choices[next].value);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <span id={help} className="sr-only">
        Normal gives direct explanations. Deep transfer guides you through one question per turn and
        waits for your answer.
      </span>
    </div>
  );
}

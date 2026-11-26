"use client";
import { createContext, useContext, useId, useState } from "react";
import { practiceCheck, checkPracticeQuantity } from "../lib/content/practice-checks";
import { PracticeSessionContext, WrittenPractice } from "./written-practice";
export type PracticeStatus = "tried" | "checked" | "revealed" | "reviewed";
export const PracticeContext = createContext<((id: string, status: PracticeStatus) => void) | null>(
  null,
);
export function InlinePractice({
  question,
  title = "Practice",
  practiceId,
  revealed = false,
}: {
  question: string;
  title?: string;
  practiceId: string;
  revealed?: boolean;
}) {
  const spec = practiceCheck(question),
    session = useContext(PracticeSessionContext),
    report = useContext(PracticeContext),
    id = useId();
  const [values, setValues] = useState<Record<number, string>>({}),
    [units, setUnits] = useState<Record<number, string>>({}),
    [choice, setChoice] = useState<number | null>(null),
    [feedback, setFeedback] = useState(""),
    [checked, setChecked] = useState(false);
  if (!spec)
    return (
      <WrittenPractice
        key={`${session?.ownerId}:${session?.sessionId}:${session?.version}:${practiceId}`}
        session={session}
        title={title}
        question={question}
        revealed={revealed}
        onStatus={(status) => report?.(practiceId, status)}
      />
    );
  function submit() {
    let ok = false,
      message = "";
    if (spec!.kind === "quantity") {
      const results = spec!.fields.map((f, i) =>
        checkPracticeQuantity(values[i] ?? "", units[i] ?? "", f),
      );
      ok = results.every((r) => r.correct);
      message = ok
        ? "Good work — every value and unit checks out."
        : results.find((r) => !r.correct)!.message;
    } else {
      if (choice === null) {
        setFeedback("Choose a response first.");
        return;
      }
      const result = spec!.choices[choice];
      ok = result.correct;
      message = result.feedback;
    }
    setChecked(ok);
    setFeedback(message);
    report?.(practiceId, ok ? "checked" : "tried");
  }
  return (
    <div className="inline-practice" data-checked={checked || undefined}>
      <span className="practice-status">
        {checked
          ? "Verified practice"
          : feedback ||
              choice !== null ||
              Object.values(values).some((v) => v.trim()) ||
              Object.values(units).some((v) => v.trim())
            ? "Tried"
            : "Unanswered"}
      </span>
      {spec.kind === "quantity" ? (
        spec.fields.map((field, i) => (
          <fieldset key={field.label}>
            <legend>{field.label}</legend>
            <label>
              Value
              <input
                inputMode="decimal"
                value={values[i] ?? ""}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [i]: e.target.value }));
                  setChecked(false);
                  setFeedback("");
                  report?.(practiceId, "tried");
                }}
              />
            </label>
            <label>
              SI unit
              <input
                placeholder="Enter a unit"
                value={units[i] ?? ""}
                onChange={(e) => {
                  setUnits((v) => ({ ...v, [i]: e.target.value }));
                  setChecked(false);
                  setFeedback("");
                  report?.(practiceId, "tried");
                }}
              />
            </label>
          </fieldset>
        ))
      ) : (
        <fieldset>
          <legend>Choose the explanation</legend>
          {spec.choices.map((c, i) => (
            <label key={c.text}>
              <input
                type="radio"
                name={id}
                checked={choice === i}
                onChange={() => {
                  setChoice(i);
                  setChecked(false);
                  setFeedback("");
                  report?.(practiceId, "tried");
                }}
              />
              {c.text}
            </label>
          ))}
        </fieldset>
      )}
      <button type="button" onClick={submit}>
        Check my attempt
      </button>
      <p role="status">{feedback}</p>
      <small>Local practice feedback · separate from assessed mastery.</small>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeMathLine } from "../../lib/math-practice/parser";
import { parseMatrix } from "../../lib/math-practice/matrix";
import { MathInput } from "./math-input";
import { PracticeNotebook } from "./practice-notebook";
import type { PracticeSnapshot } from "../../lib/math-practice/notebook";
import { Markdown } from "../markdown";
import { symbolicStep } from "../../lib/math-practice/steps";
import { checkInWorker } from "../../lib/math-practice/client";
import { createMathProblem, mathTopics, randomProblemSeed } from "../../lib/math-practice/problems";
import type {
  MathProblem,
  MathFeedback,
  RowOperation,
  SymbolicMode,
} from "../../lib/math-practice/types";
function displayLine(latex: string) {
  try {
    return normalizeMathLine(latex).expression;
  } catch {
    return latex;
  }
}
type Entry = { id: string; latex: string; feedback: MathFeedback; operation: RowOperation };
export function MathLab({
  initialReference = "",
  question,
  openNotebook = false,
}: {
  initialReference?: string;
  question?: string;
  openNotebook?: boolean;
}) {
  const [topic, setTopic] = useState<MathProblem["topic"]>("expand");
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [reference, setReference] = useState(initialReference || "(x+1)^2");
  const [next, setNext] = useState("");
  const [editingStart, setEditingStart] = useState(false);
  const [mode, setMode] = useState<SymbolicMode>(
    initialReference.trim().startsWith("\\int") ? "antiderivative" : "expression",
  );
  const [variable, setVariable] = useState<"x" | "y" | "z" | "t">("x");
  const [matrix, setMatrix] = useState(
    /\\begin\{(?:bmatrix|pmatrix|matrix|array)\}/.test(initialReference),
  );
  const [operation, setOperation] = useState<RowOperation>({
    kind: "add",
    source: 1,
    target: 2,
    factor: "-2",
  });
  const [history, setHistory] = useState<Entry[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [context, setContext] = useState(question ?? "");
  const [shown, setShown] = useState(false),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const insert = (event: Event) => {
      const text = (event as CustomEvent<unknown>).detail;
      if (!busy && typeof text === "string" && text.length <= 2000)
        setNext((n) => n + (n ? " " : "") + text.replace(/^\$|\$$/g, ""));
    };
    window.addEventListener("vela-reference-insert", insert);
    return () => window.removeEventListener("vela-reference-insert", insert);
  }, [busy]);
  function reset() {
    setHistory([]);
    setConditions([]);
    setShown(false);
    setNext("");
  }
  function variation() {
    let p = createMathProblem(topic, randomProblemSeed());
    for (let i = 0; i < 8 && p.reference === reference; i++)
      p = createMathProblem(topic, randomProblemSeed());
    reset();
    setNotes("");
    setProblem(p);
    setReference(p.reference);
    setMode(p.mode);
    setMatrix(p.topic === "matrix");
  }
  async function check() {
    if (busy || !next.trim()) return;
    setBusy(true);
    const control = new AbortController();
    controller.current = control;
    const previous =
      history.filter((e) => ["equivalent", "conditional"].includes(e.feedback.status)).at(-1)
        ?.latex ?? reference;
    // Antiderivative steps always remain anchored to the original integrand.
    const result = await checkInWorker(
      matrix
        ? { kind: "matrix", reference: previous, next, operation }
        : symbolicStep(
            reference,
            next,
            mode,
            variable,
            history
              .filter((e) => ["equivalent", "conditional"].includes(e.feedback.status))
              .map((e) => e.latex),
          ),
      control.signal,
    );
    if (control.signal.aborted) return;
    setHistory((h) => [
      ...h,
      { id: crypto.randomUUID(), latex: next, feedback: result, operation: { ...operation } },
    ]);
    if (["equivalent", "conditional"].includes(result.status)) {
      setConditions((c) => [...new Set([...c, ...(result.conditions ?? [])])]);
      setNext(matrix ? next : "");
    }
    setBusy(false);
  }
  const accepted =
    history.filter((e) => ["equivalent", "conditional"].includes(e.feedback.status)).at(-1)
      ?.latex ?? reference;
  useEffect(() => {
    if (matrix) setNext((draft) => (draft.trim() ? draft : accepted));
  }, [matrix, accepted]);
  async function restore(saved: PracticeSnapshot) {
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    setBusy(true);
    setProblem(null);
    setShown(false);
    setReference(saved.reference);
    setMode(saved.mode);
    setVariable(saved.variable);
    setMatrix(saved.matrix);
    setOperation(saved.operation);
    setNext(saved.draft);
    setContext(saved.context);
    setNotes(saved.notes ?? "");
    setHistory([]);
    setConditions([]);
    let previous = saved.reference;
    const restored: Entry[] = [],
      restrictions = new Set<string>();
    try {
      for (const line of saved.lines) {
        const feedback = await checkInWorker(
          saved.matrix
            ? { kind: "matrix", reference: previous, next: line.latex, operation: line.operation }
            : symbolicStep(
                saved.reference,
                line.latex,
                saved.mode,
                saved.variable,
                restored
                  .filter((e) => ["equivalent", "conditional"].includes(e.feedback.status))
                  .map((e) => e.latex),
              ),
          control.signal,
        );
        if (control.signal.aborted) return;
        restored.push({
          id: crypto.randomUUID(),
          latex: line.latex,
          operation: line.operation,
          feedback,
        });
        if (["equivalent", "conditional"].includes(feedback.status)) {
          previous = line.latex;
          for (const condition of feedback.conditions ?? []) restrictions.add(condition);
        }
        setHistory([...restored]);
        setConditions([...restrictions]);
      }
    } finally {
      if (!control.signal.aborted) setBusy(false);
    }
  }
  let rowCount = 3;
  try {
    if (matrix) rowCount = parseMatrix(accepted).length;
  } catch {
    /* The checker will explain incomplete matrix input. */
  }
  return (
    <section className="math-lab" aria-label="Step-by-step math scratchpad">
      <header>
        <div>
          <span className="math-eyebrow">Think · write · verify</span>
          <h2>Math scratchpad</h2>
        </div>
        <span className="math-local">Checks run on this device</span>
      </header>
      <p>
        Predict what changes, then write one complete line. Check your reasoning before revealing an
        answer.
      </p>
      <div className="math-lab-columns">
        <div className="math-lab-working">
          {context && (
            <details>
              <summary>Exercise context</summary>
              <Markdown text={context} />
            </details>
          )}
          <div className="math-generator">
            <label>
              Practice topic
              <select
                aria-label="Practice topic"
                disabled={busy}
                value={topic}
                onChange={(e) => setTopic(e.target.value as MathProblem["topic"])}
              >
                {mathTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy} onClick={variation}>
              Try another variation
            </button>
          </div>
          {problem && (
            <div className="math-problem">
              <h3>{problem.title}</h3>
              <p>{problem.question}</p>
            </div>
          )}
          <details
            className="math-settings"
            onToggle={(e) => setEditingStart(e.currentTarget.open)}
          >
            <summary>Set your own starting expression</summary>
            {editingStart && (
              <MathInput
                preview={false}
                maxLength={matrix ? 2400 : 600}
                label="Starting expression"
                value={reference}
                disabled={busy}
                onChange={(v) => {
                  setReference(v);
                  reset();
                  setProblem(null);
                }}
              />
            )}
            <label>
              Check type
              <select
                aria-label="Check type"
                disabled={busy}
                value={matrix ? "matrix" : mode}
                onChange={(e) => {
                  reset();
                  setMatrix(e.target.value === "matrix");
                  if (e.target.value !== "matrix") setMode(e.target.value as SymbolicMode);
                }}
              >
                <option value="expression">Equivalent expression</option>
                <option value="antiderivative">Antiderivative of the starting integrand</option>
                <option value="derivative">Derivative of the starting expression</option>
                <option value="matrix">Matrix row operation</option>
              </select>
            </label>
            {!matrix && (
              <label>
                Variable
                <select
                  aria-label="Differentiation variable"
                  disabled={busy}
                  value={variable}
                  onChange={(e) => {
                    setVariable(e.target.value as typeof variable);
                    reset();
                  }}
                >
                  {["x", "y", "z", "t"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
          </details>
          <div className="math-current">
            <strong>{matrix ? "Current matrix" : "Starting expression"}</strong>
            <Markdown text={`$$\n${matrix ? accepted : displayLine(reference)}\n$$`} />
          </div>
          {history.length > 0 && (
            <ol className="math-history" aria-label="Checked steps">
              {history.map((entry, i) => (
                <li key={entry.id} className={`math-result math-${entry.feedback.status}`}>
                  <strong>
                    Step {i + 1} ·{" "}
                    {entry.feedback.status === "equivalent"
                      ? "Verified"
                      : entry.feedback.status === "conditional"
                        ? "Verified with conditions"
                        : entry.feedback.status === "not-equivalent"
                          ? "Check this step"
                          : "Unverified"}
                  </strong>
                  <Markdown text={`$$\n${matrix ? entry.latex : displayLine(entry.latex)}\n$$`} />
                  <p>{entry.feedback.message}</p>
                  {entry.feedback.matrixEvidence?.inferredOperation && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setOperation(entry.feedback.matrixEvidence!.inferredOperation!);
                        setNext(entry.latex);
                      }}
                    >
                      Use detected operation and review before checking
                    </button>
                  )}
                  {entry.feedback.residualLatex && (
                    <details>
                      <summary>Show difference</summary>
                      <Markdown text={`$$\n${entry.feedback.residualLatex}\n$$`} />
                    </details>
                  )}
                  {entry.feedback.counterexample && (
                    <p>
                      At{" "}
                      {Object.entries(entry.feedback.counterexample.values)
                        .map(([k, v]) => `${k} = ${v}`)
                        .join(", ")}
                      : expected value{" "}
                      {Number(entry.feedback.counterexample.previous.toPrecision(5)).toString()},
                      proposed value{" "}
                      {Number(entry.feedback.counterexample.proposed.toPrecision(5)).toString()}
                      {mode === "antiderivative" ? " (after differentiating your line)" : ""}.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
          {conditions.length > 0 && (
            <div className="math-conditions">
              <strong>Keep these domain conditions throughout</strong>
              {conditions.map((c) => (
                <Markdown key={c} text={`$${c}$`} />
              ))}
            </div>
          )}
          {matrix && (
            <fieldset disabled={busy} className="math-row-operation">
              <legend>Declare your row operation</legend>
              <label>
                Operation
                <select
                  aria-label="Row operation"
                  value={operation.kind}
                  onChange={(e) =>
                    setOperation({
                      ...operation,
                      kind: e.target.value as RowOperation["kind"],
                      ...(e.target.value === "scale" ? { target: operation.source } : {}),
                    })
                  }
                >
                  <option value="equivalence">Overall row-equivalence (multiple operations)</option>
                  <option value="add">Add a multiple of one row to another</option>
                  <option value="swap">Swap rows</option>
                  <option value="scale">Scale a row by a nonzero factor</option>
                </select>
              </label>
              {operation.kind !== "equivalence" && (
                <label>
                  {operation.kind === "scale" ? "Row to scale" : "Source row"}
                  <select
                    aria-label="Source row"
                    value={operation.source}
                    onChange={(e) =>
                      setOperation({
                        ...operation,
                        source: Number(e.target.value),
                        ...(operation.kind === "scale" ? { target: Number(e.target.value) } : {}),
                      })
                    }
                  >
                    {Array.from({ length: rowCount }, (_, i) => i + 1).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              )}
              {operation.kind !== "scale" && operation.kind !== "equivalence" && (
                <label>
                  Target row
                  <select
                    aria-label="Target row"
                    value={operation.target}
                    onChange={(e) => setOperation({ ...operation, target: Number(e.target.value) })}
                  >
                    {Array.from({ length: rowCount }, (_, i) => i + 1).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              )}
              {operation.kind !== "swap" && operation.kind !== "equivalence" && (
                <MathInput
                  label="Row factor"
                  scalar
                  preview={false}
                  value={operation.factor}
                  onChange={(v) => setOperation({ ...operation, factor: v })}
                />
              )}
            </fieldset>
          )}
          <MathInput
            maxLength={matrix ? 2400 : 600}
            preview={false}
            allowedTemplates={
              matrix
                ? ["Fraction", "Power", "Matrix"]
                : mode === "antiderivative" || topic === "integral"
                  ? ["Fraction", "Power", "Integral"]
                  : mode === "derivative" || topic === "derivative"
                    ? ["Fraction", "Power", "Derivative"]
                    : topic === "limit" || reference.includes("\\lim")
                      ? ["Fraction", "Power", "Limit"]
                      : ["Fraction", "Power"]
            }
            label={matrix ? "Your next matrix" : "Your next line"}
            value={next}
            disabled={busy}
            onChange={setNext}
          />
          <p className="learning-caption">
            {matrix
              ? "Choose one exact operation, or explicitly check overall row-equivalence."
              : mode === "antiderivative"
                ? "Primitive checks differentiate your line against the original integrand. Put substitutions in Working notes."
                : "Each complete line is compared with the last accepted line. Rejected and unverified lines never become the baseline."}
          </p>
          <div className="math-actions">
            {busy && (
              <button
                type="button"
                onClick={() => {
                  controller.current?.abort();
                  setBusy(false);
                }}
              >
                Stop checking
              </button>
            )}
            <button type="button" disabled={busy || !next.trim()} onClick={() => void check()}>
              {busy ? "Checking on your device…" : "Check step"}
            </button>
            <button type="button" disabled={busy} onClick={reset}>
              Clear steps
            </button>
            {problem && (
              <button
                type="button"
                disabled={busy}
                aria-expanded={shown}
                onClick={() => setShown((s) => !s)}
              >
                {shown ? "Hide practice answer" : "Show practice answer"}
              </button>
            )}
          </div>
          {shown && problem && (
            <div className="math-worked">
              <Markdown text={`$$\n${problem.answer}\n$$\n\n${problem.explanation}`} />
            </div>
          )}
        </div>
        <aside className="math-lab-rail" aria-label="Scratchpad tools and guidance">
          <details className="notebook-side-drawer" open={openNotebook || undefined}>
            <summary>My practice notebook</summary>
            <PracticeNotebook
              initiallyOpen={openNotebook}
              busy={busy}
              onLoad={restore}
              snapshot={{
                version: 1,
                reference,
                draft: next,
                mode,
                variable,
                matrix,
                operation,
                notes,
                context: [context, problem?.question].filter(Boolean).join("\n"),
                lines: history.map((entry) => ({ latex: entry.latex, operation: entry.operation })),
              }}
            />
          </details>
          <details className="math-support">
            <summary>Working notes & substitutions</summary>
            <p>
              Write u = …, du = …, method choices or domain reminders here. Notes are not graded and
              do not replace the last valid expression. Save a notebook copy to keep them.
            </p>
            <label>
              Private scratch notes
              <textarea
                aria-label="Private scratch notes"
                value={notes}
                maxLength={4000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="u = x³ + x² + 1; du = (3x² + 2x) dx"
              />
            </label>
          </details>
          <details className="math-support">
            <summary>What can this checker verify?</summary>
            <p>
              Real algebra, higher powers, trigonometric identities, multi-rule derivatives,
              antiderivatives with logarithms, roots, finite
              rational/radical/trigonometric/exponential limits, and exact row operations or
              row-equivalence checks up to 6 × 7. Use a domain note such as ; x != 2 or ; x &gt; 0.
              Piecewise branches require separate interval checks; definite integrals, arbitrary
              equations and general proofs still need tutor review. Unverified does not mean wrong.
            </p>
            <p>
              This scratchpad is practice, not a graded assessment. Checks run on this device and do
              not update mastery. Steps reset when you leave unless you explicitly save a private
              notebook copy. Saved lines are rechecked when reopened.
            </p>
          </details>
        </aside>
      </div>
    </section>
  );
}

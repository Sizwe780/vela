"use client";
import { useId, useRef, useState } from "react";
import {
  calculatorNumber,
  evaluateScientific,
  type AngleMode,
} from "../../lib/math-practice/scientific-calculator";
type Calculation = { id: number; expression: string; value: number; mode: AngleMode };
const functions = [
  ["sin", "sin("],
  ["cos", "cos("],
  ["tan", "tan("],
  ["asin", "asin("],
  ["acos", "acos("],
  ["atan", "atan("],
  ["x²", "^2"],
  ["xʸ", "^("],
  ["√x", "sqrt("],
  ["ⁿ√x", "root("],
  ["ln", "ln("],
  ["log₁₀", "log("],
  ["eˣ", "exp("],
  ["10ˣ", "10^("],
  ["n!", "!"],
  ["1/x", "1/("],
  ["nCr", "ncr("],
  ["nPr", "npr("],
] as const;
export function ScientificCalculator({ onInsert }: { onInsert?: (value: string) => void }) {
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    sequence = useRef(0);
  const [expression, setExpression] = useState(""),
    [mode, setMode] = useState<AngleMode>("RAD"),
    [history, setHistory] = useState<Calculation[]>([]),
    [result, setResult] = useState<number | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  function change(value: string) {
    setExpression(value);
    setResult(null);
    setError("");
    setNotice("");
  }
  function insert(text: string) {
    const start = input.current?.selectionStart ?? expression.length,
      end = input.current?.selectionEnd ?? start;
    const value = expression.slice(0, start) + text + expression.slice(end);
    if (value.length > 1000) {
      setError("Use at most 1000 characters.");
      return;
    }
    change(value);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  function backspace() {
    const start = input.current?.selectionStart ?? expression.length,
      end = input.current?.selectionEnd ?? start;
    if (start !== end) {
      change(expression.slice(0, start) + expression.slice(end));
      return;
    }
    if (start > 0) {
      change(expression.slice(0, start - 1) + expression.slice(end));
      requestAnimationFrame(() => {
        input.current?.focus();
        input.current?.setSelectionRange(start - 1, start - 1);
      });
    }
  }
  function evaluate() {
    try {
      const value = evaluateScientific(expression, mode, history[0]?.value ?? 0);
      setResult(value);
      setError("");
      setHistory((old) =>
        [{ id: ++sequence.current, expression, value, mode }, ...old].slice(0, 12),
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Check the expression.");
    }
  }
  return (
    <section className="science-tool-card scientific-calculator" aria-labelledby={id}>
      <header className="science-tool-header">
        <div>
          <span className="eyebrow">NUMERICAL WORKING</span>
          <h2 id={id}>Scientific calculator</h2>
        </div>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          evaluate();
        }}
      >
        <div className="scientific-display">
          <div className="scientific-mode">
            <span className="scientific-mode-badge" aria-label={`Angle mode: ${mode}`}>
              {mode}
            </span>
            <div role="group" aria-label="Calculator angle mode">
              {(["DEG", "RAD"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setResult(null);
                    setError("");
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <label htmlFor={id + "-expression"}>Expression</label>
          <input
            id={id + "-expression"}
            ref={input}
            value={expression}
            onChange={(e) => change(e.target.value)}
            maxLength={1000}
            autoComplete="off"
            spellCheck={false}
            placeholder="sin(30) or sqrt(9)"
          />
          <output aria-live="polite" aria-label="Calculator result">
            {result === null ? "Ready" : calculatorNumber(result)}
          </output>
          {error && <p role="alert">{error}</p>}
          {result !== null && (
            <button
              type="button"
              onClick={async () => {
                const text = calculatorNumber(result);
                if (onInsert) onInsert(text);
                else
                  try {
                    await navigator.clipboard.writeText(text);
                    setNotice("Result copied.");
                  } catch {
                    setNotice("Select the displayed result to copy it.");
                  }
              }}
            >
              {onInsert ? "Insert result into answer" : "Copy result"}
            </button>
          )}
        </div>
        <div className="scientific-functions" role="group" aria-label="Scientific functions">
          {functions.map(([label, text]) => (
            <button
              type="button"
              key={label}
              title={label === "ⁿ√x" ? "root(value, index), for example root(8,3)" : label}
              onClick={() => insert(text)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="scientific-constants" role="group" aria-label="Constants and editing">
          <button type="button" onClick={() => insert("(")}>
            (
          </button>
          <button type="button" onClick={() => insert(")")}>
            )
          </button>
          <button type="button" onClick={() => insert("π")}>
            π
          </button>
          <button type="button" onClick={() => insert("e")}>
            e
          </button>
          <button type="button" onClick={() => insert("ans")}>
            Ans
          </button>
          <button type="button" onClick={() => insert(",")}>
            ,
          </button>
          <button type="button" onClick={backspace} aria-label="Backspace">
            ⌫
          </button>
          <button type="button" onClick={() => change("")}>
            Clear
          </button>
        </div>
        <div className="scientific-keypad" role="group" aria-label="Numbers and arithmetic">
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "EXP", "+"].map(
            (key) => (
              <button
                type="button"
                key={key}
                onClick={() =>
                  insert(
                    key === "EXP"
                      ? /\d$/.test(
                          expression.slice(0, input.current?.selectionStart ?? expression.length),
                        )
                        ? "e"
                        : "1e"
                      : key,
                  )
                }
              >
                {key}
              </button>
            ),
          )}
        </div>
        <button type="submit" className="scientific-equals" aria-label={`Evaluate in ${mode}`}>
          = · {mode}
        </button>
      </form>
      <p className="learning-caption">
        Functions use parentheses. Use root(8,3) for a cube root and nCr(5,2) for combinations.
        Numerical real-valued results use floating-point arithmetic; use the scratchpad for symbolic
        reasoning and the converter for units.
      </p>
      <p role="status">{notice}</p>
      {!!history.length && (
        <div className="scientific-history">
          <div className="science-tool-header">
            <h3>Recent calculations</h3>
            <button type="button" onClick={() => setHistory([])}>
              Clear history
            </button>
          </div>
          <ol>
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Reuse result ${calculatorNumber(item.value)} from ${item.expression} in ${item.mode}`}
                  onClick={() => insert("(" + calculatorNumber(item.value) + ")")}
                >
                  <span>{item.expression}</span>
                  <strong>{calculatorNumber(item.value)}</strong>
                  <small>{item.mode}</small>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

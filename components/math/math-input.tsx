"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MathfieldElement } from "mathlive";
import { Markdown } from "../markdown";
import { unsafeMathFormatting } from "../../lib/math-practice/display";
const templates = [
  ["Fraction", String.raw`\frac{#?}{#?}`],
  ["Power", "#?^{#?}"],
  ["Matrix", String.raw`\begin{bmatrix}#?&#?&#?\\#?&#?&#?\\#?&#?&#?\end{bmatrix}`],
  ["Integral", String.raw`\int #?\,dx`],
  ["Limit", String.raw`\lim_{x\to #?}\left(#?\right)`],
  ["Derivative", String.raw`\frac{d}{dx}\left(#?\right)`],
] as const;
export function MathInput({
  label,
  value,
  onChange,
  disabled = false,
  scalar = false,
  preview = true,
  allowedTemplates,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  scalar?: boolean;
  preview?: boolean;
  allowedTemplates?: readonly string[];
}) {
  const host = useRef<HTMLDivElement>(null),
    field = useRef<MathfieldElement | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const latest = useRef(value);
  latest.current = value;
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const id = useId();
  const blocked = unsafeMathFormatting(value);
  useEffect(() => {
    let disposed = false;
    import("mathlive")
      .then(({ MathfieldElement }) => {
        if (disposed || !host.current) return;
        MathfieldElement.fontsDirectory = "/mathlive/fonts";
        MathfieldElement.soundsDirectory = null;
        const mf = new MathfieldElement({ mathVirtualKeyboardPolicy: "manual" });
        // Explicit focus initializes MathLive's keyboard delegate before typing.
        mf.addEventListener("click", () => mf.focus(), { capture: true });
        mf.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
          }
        });
        mf.setAttribute("aria-label", label);
        mf.value = unsafeMathFormatting(latest.current) ? "" : latest.current;
        mf.addEventListener(
          "paste",
          (event) => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (unsafeMathFormatting(text)) {
              event.preventDefault();
              event.stopImmediatePropagation();
              change.current(text.slice(0, 600));
            }
          },
          { capture: true },
        );
        mf.addEventListener("input", () => change.current(mf.getValue("latex").slice(0, 600)));
        host.current.append(mf);
        field.current = mf;
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("failed");
      });
    return () => {
      disposed = true;
      field.current?.remove();
      field.current = null;
      window.mathVirtualKeyboard?.hide();
    };
  }, [label]);
  useEffect(() => {
    const mf = field.current;
    if (mf) {
      const displayed = unsafeMathFormatting(value) ? "" : value;
      if (mf.value !== displayed) mf.value = displayed;
      if (mf.readOnly !== disabled) mf.readOnly = disabled;
    }
  }, [value, disabled, state]);
  useEffect(() => {
    if (state !== "ready") return;
    const keyboard = window.mathVirtualKeyboard;
    const geometry = () => {
      const height =
        keyboard.visible && field.current?.hasFocus() ? keyboard.boundingRect.height : 0;
      setKeyboardHeight(height);
      if (height) requestAnimationFrame(() => host.current?.scrollIntoView({ block: "center" }));
    };
    keyboard.addEventListener("geometrychange", geometry);
    return () => keyboard.removeEventListener("geometrychange", geometry);
  }, [state]);
  function insert(latex: string) {
    field.current?.focus();
    field.current?.insert(latex, { selectionMode: "placeholder" });
  }
  return (
    <div className="math-input">
      <span id={id} className="math-input-label">
        {label}
      </span>
      <div ref={host} className="math-field-host" aria-labelledby={id} />
      {state === "loading" && <p role="status">Loading math keyboard…</p>}
      {state === "failed" && (
        <label>
          Math notation (LaTeX)
          <textarea
            aria-label={label}
            maxLength={600}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </label>
      )}
      <div className="math-palette" aria-label={`${label} templates`}>
        {templates
          .filter(
            ([name]) =>
              (!scalar || name === "Fraction" || name === "Power") &&
              (!allowedTemplates || allowedTemplates.includes(name)),
          )
          .map(([name, latex]) => (
            <button
              key={name}
              type="button"
              disabled={disabled || state !== "ready"}
              onClick={() => insert(latex)}
            >
              {name}
            </button>
          ))}
        <button
          type="button"
          disabled={disabled || state !== "ready"}
          onClick={() => {
            const mf = field.current;
            if (!mf) return;
            mf.focus();
            // Keep the shared keyboard in the native dialog's top layer when applicable.
            window.mathVirtualKeyboard.container = host.current?.closest("dialog") ?? document.body;
            window.mathVirtualKeyboard.show();
          }}
        >
          Math keyboard
        </button>
      </div>
      {blocked && (
        <div role="alert">
          <p>
            Use mathematical notation only. Links, HTML attributes and custom commands cannot be
            displayed here.
          </p>
          <code>{value}</code>
          <button type="button" disabled={disabled} onClick={() => onChange("")}>
            Clear unsupported formatting
          </button>
        </div>
      )}
      {preview && value && !blocked && (
        <div className="math-preview" aria-label={`${label} preview`}>
          <Markdown
            text={`$$\n${value.replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g, "\\square")}\n$$`}
          />
        </div>
      )}
      {keyboardHeight > 0 &&
        createPortal(
          <button
            type="button"
            className="math-keyboard-close"
            style={{ bottom: keyboardHeight + 8 }}
            onClick={() => window.mathVirtualKeyboard.hide()}
          >
            Hide math keyboard
          </button>,
          host.current?.closest("dialog") ?? document.body,
        )}
    </div>
  );
}

"use client";

import { useRef } from "react";
import { MathInsert } from "./math-insert";

/** Question-scoped tools: narrative answers remain ordinary text. */
export function AnswerSymbols({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDetailsElement>(null);
  const mathematical =
    /\$|\\(?:frac|ce|rho|Delta|mathrm)|\b(?:calculate|formula|equation|matrix|derivative|integral|uncertainty|velocity|density|moles?|force|mass|volume|limit|chemical|reaction|molecular|atom|ion|stoichiometry|equilibrium|vector|determinant|matrices|speed|acceleration|momentum|energy|pressure|temperature|concentration)\b/i.test(
      question,
    );
  if (!mathematical) return null;
  const templates = ["Fraction", "Power", "Subscript"];
  const chemistry =
    /chemical|reaction|molecul|\\ce\b|atoms?|ions?|moles?|stoichiometr|equilibrium/i.test(question);
  const symbols = chemistry
    ? ["±", "×", "Δ", "₂", "₃", "⁺", "⁻", "→", "⇌", "°", "μ"]
    : ["±", "×", "π", "Δ", "θ", "ρ", "μ", "²", "³", "°"];
  if (/matrix|matrices|row reduc|determinant|bmatrix/i.test(question)) templates.push("Matrix");
  if (/integral|integrat|antiderivative|\\int\b/i.test(question)) templates.push("Integral");
  if (/\blimit|\\lim\b/i.test(question)) templates.push("Limit");
  if (/derivative|differentiat/i.test(question)) templates.push("Derivative");
  function insert(text: string) {
    const input = host.current?.parentElement?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >("textarea, input:not([type=radio])");
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + text.length, start + text.length);
    });
  }
  return (
    <details ref={host} className="answer-symbols">
      <summary>Symbols &amp; math keyboard</summary>
      <MathInsert
        allowedTemplates={templates}
        disabled={disabled}
        onInsert={(latex) => insert(` $${latex}$ `)}
      />
      <div className="math-palette" aria-label="Common symbols">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            disabled={disabled}
            aria-label={`Insert ${symbol}`}
            onClick={() => insert(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>
    </details>
  );
}

"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
const MathInput = dynamic(() => import("./math-input").then((m) => m.MathInput), { ssr: false });
export function MathInsert({
  onInsert,
  disabled = false,
  embedded = false,
}: {
  onInsert: (latex: string) => void;
  disabled?: boolean;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [value, setValue] = useState("");
  return (
    <div className="math-insert">
      {!embedded && (
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Insert math
        </button>
      )}
      {(embedded || open) && (
        <div className="math-insert-editor">
          <MathInput label="Math to insert" value={value} onChange={setValue} disabled={disabled} />
          <button
            type="button"
            disabled={disabled || !value.trim()}
            onClick={() => {
              onInsert(value);
              setValue("");
              setOpen(false);
            }}
          >
            Use expression
          </button>
        </div>
      )}
    </div>
  );
}

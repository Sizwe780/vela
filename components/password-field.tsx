"use client";
import { useId, useState } from "react";

export function PasswordField({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "current" | "new";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-row">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          value={value}
          autoComplete={kind === "new" ? "new-password" : "current-password"}
          minLength={kind === "new" ? 8 : undefined}
          maxLength={128}
          aria-describedby={kind === "new" ? id + "-rules" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          aria-label={(visible ? "Hide " : "Show ") + label.toLowerCase()}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {kind === "new" && (
        <small id={id + "-rules"}>8–128 characters. A unique passphrase is a good choice.</small>
      )}
    </div>
  );
}

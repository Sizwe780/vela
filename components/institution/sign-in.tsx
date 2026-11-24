"use client";
import { useState } from "react";
import { authClient } from "../../lib/auth/client";
import type { SsoProvider } from "../../lib/institution/input";

export function InstitutionSignIn({
  options,
}: {
  options: { institution: string; provider: SsoProvider }[];
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function signIn(provider: SsoProvider) {
    setWorking(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin + "/",
      });
      if (result.error)
        setError("Institution sign-in failed. Check with your institution or use email sign-in.");
    } catch {
      setError("We couldn’t reach the sign-in provider. Try again.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <div>
      {options.map((option) => (
        <button
          className="primary-button"
          type="button"
          key={option.institution}
          disabled={working}
          onClick={() => void signIn(option.provider)}
        >
          {option.institution} · {option.provider === "google" ? "Google" : "Microsoft"}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

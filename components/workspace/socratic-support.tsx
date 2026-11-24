"use client";
import { useModuleCapabilities } from "../module-capabilities";
export type TeachingStrategy = "coach" | "debate";
export function SocraticSupport({
  strategy,
  onStrategy,
  onHint,
  busy,
  hasQuestion,
}: {
  strategy: TeachingStrategy;
  onStrategy: (s: TeachingStrategy) => void;
  onHint: (tier: 1 | 2 | 3) => void;
  busy: boolean;
  hasQuestion: boolean;
}) {
  const capabilities = useModuleCapabilities();
  return (
    <section className="socratic-support" aria-label="Guidance">
      {capabilities.debate && (
        <label>
          Learning approach
          <select
            aria-label="Learning approach"
            value={strategy}
            disabled={busy}
            onChange={(e) => onStrategy(e.target.value as TeachingStrategy)}
          >
            <option value="coach">Guided conversation</option>
            <option value="debate">Socratic debate</option>
          </select>
        </label>
      )}
      {strategy === "debate" ? (
        <p>
          State a claim and your reasons. The tutor will challenge one premise at a time with a
          hypothetical counter-position. Participation is not mastery.
        </p>
      ) : (
        <>
          <p>
            Start with a nudge and ask for more structure if needed. The parallel example uses a
            different problem so you can still do your own work.
          </p>
          <div className="hint-ladder" role="group" aria-label="Hint progression">
            {(
              [
                { tier: 1, label: "1 · Nudge" },
                { tier: 2, label: "2 · Structural guide" },
                { tier: 3, label: "3 · Parallel example" },
              ] as const
            ).map((h) => (
              <button
                type="button"
                key={h.tier}
                disabled={busy || !hasQuestion}
                onClick={() => onHint(h.tier)}
              >
                {h.label}
              </button>
            ))}
          </div>
          <small>
            {!hasQuestion
              ? "Type or send a question first. Hints use that question in the active session."
              : "Hint requests guide your next step; they do not award mastery."}
          </small>
        </>
      )}
    </section>
  );
}

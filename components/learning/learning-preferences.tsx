"use client";
import { notifyProgress } from "../../lib/progress-events";
import { useState } from "react";
import { studentRequest } from "../../lib/student/client";
import type { LearningView } from "../../lib/learning/types";
export function LearningPreferences({
  view,
  onSaved,
}: {
  view: LearningView;
  onSaved: () => void;
}) {
  const [previewModule, setPreviewModule] = useState(view.modules[0]?.id ?? "");
  const [preview, setPreview] = useState<{
    scope: string;
    entries: { title: string; description: string }[];
  } | null>(null);
  const [context, setContext] = useState(view.preferences.tutorContext),
    [cross, setCross] = useState(view.preferences.crossModule),
    [slots, setSlots] = useState(
      view.preferences.availability.filter((s) => Date.parse(s.startAt) > Date.now()),
    ),
    [start, setStart] = useState(""),
    [minutes, setMinutes] = useState(25),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setNotice("");
    try {
      await studentRequest("/api/learning", "PUT", {
        ownerId: view.ownerId,
        tutorContext: context,
        crossModule: context && cross,
        availability: slots.filter((s) => Date.parse(s.startAt) > Date.now()),
      });
      setPreview(null);
      setNotice("Learning preferences saved.");
      notifyProgress();
      onSaved();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (
      !confirm(
        "Delete your concept checks and provisional estimates? Course grades, notes and session progress are kept.",
      )
    )
      return;
    setBusy(true);
    try {
      await studentRequest("/api/learning", "DELETE", { ownerId: view.ownerId });
      window.dispatchEvent(new Event("vela-concept-reset"));
      setNotice("Concept practice history reset.");
      notifyProgress();
      onSaved();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="learning-settings">
      <summary>Privacy and study availability</summary>
      <div className="learning-settings-body">
        <label className="check-label">
          <input
            type="checkbox"
            checked={context}
            onChange={(e) => {
              setContext(e.target.checked);
              if (!e.target.checked) setCross(false);
            }}
          />
          Let my tutor use small summaries of my assessed concept practice
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={cross}
            disabled={!context}
            onChange={(e) => setCross(e.target.checked)}
          />
          Include relevant concept estimates from my other enrolled modules
        </label>
        <p className="learning-caption">
          Both are off initially. When enabled, the AI receives only relevant concept summaries, not
          your notes, answer text, identity or schedule. Course sources and assessment rules remain
          scoped to the current module.
        </p>
        {view.modules.length > 0 && (
          <label>
            Preview module
            <select
              aria-label="Preview module"
              value={previewModule}
              onChange={(e) => {
                setPreviewModule(e.target.value);
                setPreview(null);
              }}
            >
              {view.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}
                </option>
              ))}
            </select>
          </label>
        )}
        {previewModule && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void studentRequest<{
                scope: string;
                entries: { title: string; description: string }[];
              }>(`/api/learning/context?moduleId=${encodeURIComponent(previewModule)}`)
                .then(setPreview)
                .catch((e) => setNotice(e.message))
            }
          >
            Preview saved tutor context
          </button>
        )}
        {preview && (
          <section aria-label="Tutor context preview">
            <h3>{preview.scope}</h3>
            {preview.entries.length ? (
              <ul>
                {preview.entries.map((e) => (
                  <li key={e.title}>
                    {e.title}: {e.description}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No assessed practice summaries will be sent for this module with the saved settings.
              </p>
            )}
          </section>
        )}
        <h3>Your available study periods</h3>
        <p className="learning-caption">
          Add dated availability for the next 30 days. Times use your device timezone. Vela suggests
          up to 25 minutes within each period; it does not infer your exam dates.
        </p>
        <div className="availability-inputs">
          <label>
            Available from
            <input
              aria-label="Available from"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Available minutes
            <input
              type="number"
              min={10}
              max={120}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={busy || !start || slots.length >= 14}
            onClick={() => {
              const d = new Date(start);
              if (
                !Number.isFinite(d.getTime()) ||
                d.getTime() <= Date.now() ||
                d.getTime() > Date.now() + 30 * 86400000 ||
                !Number.isInteger(minutes) ||
                minutes < 10 ||
                minutes > 120
              ) {
                setNotice("Choose a future period within 30 days and 10–120 minutes.");
                return;
              }
              setSlots((s) => [...s, { startAt: d.toISOString(), minutes }]);
              setStart("");
            }}
          >
            Add period
          </button>
        </div>
        <ul>
          {slots.map((s, i) => (
            <li key={s.startAt + i}>
              {new Date(s.startAt).toLocaleString()} · {s.minutes} minutes{" "}
              <button type="button" onClick={() => setSlots((v) => v.filter((_, j) => j !== i))}>
                Remove period {i + 1}
              </button>
            </li>
          ))}
        </ul>
        <div className="learning-actions">
          <button type="button" disabled={busy} onClick={() => void save()}>
            Save learning preferences
          </button>
          <button type="button" disabled={busy} onClick={() => void reset()}>
            Reset concept estimates
          </button>
        </div>
        <p role="status">{notice}</p>
      </div>
    </details>
  );
}

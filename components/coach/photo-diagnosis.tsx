"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Markdown } from "../markdown";
import { checkInWorker } from "../../lib/math-practice/client";
import type { MathFeedback } from "../../lib/math-practice/types";
import type { WorkStep, Diagnosis } from "../../lib/coach/types";
const MathInput = dynamic(() => import("../math/math-input").then((m) => m.MathInput), {
  ssr: false,
});
const fullCrop = { left: 0, top: 0, right: 100, bottom: 100 };
export function PhotoDiagnosis({
  studyUnitId,
  sessionId,
  onAsk,
}: {
  studyUnitId: string;
  sessionId: string;
  onAsk: (text: string) => void;
}) {
  const [url, setUrl] = useState(""),
    [crop, setCrop] = useState(fullCrop),
    [prepared, setPrepared] = useState("");
  const [steps, setSteps] = useState<WorkStep[]>([]),
    [question, setQuestion] = useState(""),
    [consent, setConsent] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [checks, setChecks] = useState<{ number: number; feedback: MathFeedback }[]>([]),
    [mode, setMode] = useState<"expression" | "antiderivative">("expression");
  const img = useRef<HTMLImageElement>(null),
    request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  function resetReview() {
    setSteps([]);
    setDiagnosis(null);
    setChecks([]);
    setConfirmed(false);
    setNotice("");
  }
  function updateStep(index: number, data: Partial<WorkStep>) {
    setSteps((s) => s.map((v, i) => (i === index ? { ...v, ...data } : v)));
    setConfirmed(false);
    setDiagnosis(null);
    setChecks([]);
  }
  async function prepare() {
    const image = img.current;
    if (!image?.naturalWidth) return;
    setError("");
    if (image.naturalWidth * image.naturalHeight > 30000000) {
      setError("Choose a smaller photo (up to 30 megapixels).");
      return;
    }
    const sx = (image.naturalWidth * crop.left) / 100,
      sy = (image.naturalHeight * crop.top) / 100,
      sw = (image.naturalWidth * (crop.right - crop.left)) / 100,
      sh = (image.naturalHeight * (crop.bottom - crop.top)) / 100;
    const scale = Math.min(1, 1600 / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser cannot prepare the crop.");
      return;
    }
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.82);
    if (imageData.length > 1750000) {
      setError("This crop is still too large. Crop a smaller area of working.");
      return;
    }
    resetReview();
    setPrepared(imageData);
  }
  async function post(path: string, body: object) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(data.error?.message || "The tutor is unavailable. Keep your work and retry.");
    return data;
  }
  async function transcribe() {
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/tutor/photo", { studyUnitId, sessionId, image: prepared });
      setSteps(data.steps);
      setNotice(data.notice);
      setConfirmed(false);
      setDiagnosis(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function diagnose() {
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/tutor/diagnose", {
        studyUnitId,
        sessionId,
        question,
        confirmed: true,
        steps: steps.map(({ number, latex, description }) => ({ number, latex, description })),
      });
      setDiagnosis(data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function localCheck() {
    setBusy(true);
    setError("");
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    const result: { number: number; feedback: MathFeedback }[] = [];
    try {
      for (let i = 1; i < steps.length; i++) {
        const feedback = await checkInWorker(
          {
            kind: "symbolic",
            reference: steps[mode === "antiderivative" ? 0 : i - 1].latex,
            next: steps[i].latex,
            mode,
            variable: "x",
          },
          c.signal,
        );
        if (c.signal.aborted) return;
        result.push({ number: i + 1, feedback });
      }
      setChecks(result);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="coach-section" aria-label="Snap and diagnose">
      <h3>Make your handwritten thinking visible</h3>
      <p>
        Crop out names and student numbers. Only the prepared crop is sent to Cloudflare when you
        choose to transcribe; Vela does not store the photo.
      </p>
      <label>
        Photograph or upload your working
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (
              file.size > 20000000 ||
              !["image/jpeg", "image/png", "image/webp"].includes(file.type)
            ) {
              setError("Choose a JPEG, PNG or WebP under 20 MB.");
              return;
            }
            setUrl(URL.createObjectURL(file));
            setPrepared("");
            setCrop(fullCrop);
            setQuestion("");
            resetReview();
            setError("");
          }}
        />
      </label>
      {url && (
        <>
          <div className="photo-crop">
            <img
              ref={img}
              src={url}
              alt="Your working before cropping"
              onError={() => setError("This image could not be opened. Try another photo.")}
            />
            <div
              aria-hidden="true"
              className="crop-box"
              style={{
                left: crop.left + "%",
                top: crop.top + "%",
                width: crop.right - crop.left + "%",
                height: crop.bottom - crop.top + "%",
              }}
            />
          </div>
          <fieldset disabled={busy} className="crop-controls">
            <legend>Choose the area to read</legend>
            {(["left", "top", "right", "bottom"] as const).map((edge) => (
              <label key={edge}>
                {edge} · {crop[edge]}%
                <input
                  aria-label={`Crop ${edge}`}
                  type="range"
                  min={edge === "right" ? crop.left + 5 : edge === "bottom" ? crop.top + 5 : 0}
                  max={edge === "left" ? crop.right - 5 : edge === "top" ? crop.bottom - 5 : 100}
                  value={crop[edge]}
                  onChange={(e) => {
                    setCrop({ ...crop, [edge]: Number(e.target.value) });
                    setPrepared("");
                    resetReview();
                  }}
                />
              </label>
            ))}
          </fieldset>
          <button type="button" disabled={busy} onClick={() => void prepare()}>
            Prepare crop
          </button>
        </>
      )}
      {prepared && (
        <>
          <img
            className="prepared-crop"
            src={prepared}
            alt="Only this cropped image will be sent"
          />
          <label className="coach-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Send this crop to Cloudflare for transcription. I have removed personal details.
          </label>
          <button type="button" disabled={busy || !consent} onClick={() => void transcribe()}>
            {busy ? "Working…" : "Transcribe this crop"}
          </button>
        </>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          resetReview();
          setSteps([{ number: 1, latex: "", description: "", uncertain: true }]);
        }}
      >
        Type steps instead
      </button>
      {notice && <p role="status">{notice}</p>}
      {steps.length > 0 && (
        <div className="transcription-review">
          <h3>Review the transcription first</h3>
          <p>
            OCR can misread a minus sign, exponent or fraction. Correct each line before asking for
            feedback.
          </p>
          <label>
            What are you trying to solve?
            <textarea
              value={question}
              maxLength={1000}
              disabled={busy}
              onChange={(e) => {
                setQuestion(e.target.value);
                setDiagnosis(null);
              }}
            />
          </label>
          {steps.map((step, i) => (
            <article
              key={step.number}
              className={`work-step ${diagnosis?.steps.find((s) => s.number === step.number)?.status ?? ""}`}
            >
              <h4>
                Step {step.number}{" "}
                {step.uncertain && <span className="coach-badge">Check unclear symbols</span>}
              </h4>
              <MathInput
                label={`Equation in step ${step.number}`}
                value={step.latex}
                disabled={busy}
                onChange={(latex) => updateStep(i, { latex, uncertain: false })}
              />
              <label>
                Written reasoning
                <textarea
                  aria-label={`Reasoning in step ${step.number}`}
                  value={step.description}
                  maxLength={400}
                  disabled={busy}
                  onChange={(e) => updateStep(i, { description: e.target.value, uncertain: false })}
                />
              </label>
              <button
                type="button"
                disabled={busy || steps.length === 1}
                onClick={() => {
                  setSteps((s) =>
                    s.filter((_, j) => j !== i).map((v, j) => ({ ...v, number: j + 1 })),
                  );
                  setConfirmed(false);
                  setDiagnosis(null);
                  setChecks([]);
                }}
              >
                Remove step {step.number}
              </button>
            </article>
          ))}
          <button
            type="button"
            disabled={busy || steps.length >= 12}
            onClick={() => {
              setSteps((s) => [
                ...s,
                { number: s.length + 1, latex: "", description: "", uncertain: true },
              ]);
              setConfirmed(false);
              setDiagnosis(null);
              setChecks([]);
            }}
          >
            Add a step
          </button>
          <label className="coach-consent">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I checked these lines against my working, including signs and exponents.
          </label>
          <button
            type="button"
            disabled={
              busy || !confirmed || steps.some((s) => !s.latex.trim() && !s.description.trim())
            }
            onClick={() => void diagnose()}
          >
            Confirm and diagnose
          </button>
          <details>
            <summary>Check adjacent algebra locally, without AI</summary>
            <label>
              Check type
              <select
                value={mode}
                disabled={busy}
                onChange={(e) => {
                  setMode(e.target.value as typeof mode);
                  setChecks([]);
                }}
              >
                <option value="expression">Equivalent expressions</option>
                <option value="antiderivative">Antiderivatives of step 1</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !confirmed || steps.length < 2}
              onClick={() => void localCheck()}
            >
              Check algebra locally
            </button>
            <p>
              This checks expressions in x, not general equations or proofs. Step 1 and written
              reasoning still need a tutor review.
            </p>
          </details>
          {checks.map((c) => (
            <div key={c.number} className={`math-result math-${c.feedback.status}`}>
              <strong>
                Local check · step {c.number} · {c.feedback.status}
              </strong>
              <p>{c.feedback.message}</p>
              {c.feedback.residualLatex && <Markdown text={`$${c.feedback.residualLatex}$`} />}{" "}
              {c.feedback.conditions?.map((d) => (
                <Markdown key={d} text={`$${d}$`} />
              ))}
            </div>
          ))}
        </div>
      )}
      {diagnosis && (
        <div className="diagnosis-result">
          <span className="coach-badge">AI review · provisional · no mastery awarded</span>
          <Markdown text={diagnosis.summary} />
          {diagnosis.steps.map((s) => (
            <article className={`work-step ${s.status}`} key={s.number}>
              <h4>
                Step {s.number} ·{" "}
                {s.status === "revisit"
                  ? "Revisit this line"
                  : s.status === "uncertain"
                    ? "Needs clarification"
                    : "Appears consistent"}
              </h4>
              <Markdown text={s.feedback} />
              <Markdown text={s.hint} />
            </article>
          ))}
          <Markdown text={diagnosis.nextQuestion} />
          <button
            type="button"
            onClick={() =>
              onAsk(
                `Help me reason through my confirmed working. Question: ${question}\n${steps.map((s) => `Step ${s.number}: $${s.latex}$ ${s.description}`).join("\n")}\nGive a hint about the first error before showing a solution.`,
              )
            }
          >
            Discuss this working with my tutor
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="coach-error">
          {error}
        </p>
      )}
    </section>
  );
}

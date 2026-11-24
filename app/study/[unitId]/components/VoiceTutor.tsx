"use client";
import { useState } from "react";
import { SourceDrawer } from "../../../../components/source-drawer";
import { useVoiceTutor } from "../../../../components/voice/use-voice-tutor";
export function VoiceTutor(props: {
  onTranscript: (text: string) => void | Promise<void>;
  answer: string;
  studyUnitId: string;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false),
    [consent, setConsent] = useState(false);
  const voice = useVoiceTutor(props);
  const active = voice.listening || voice.speaking || voice.handsFree || voice.pending;
  return (
    <>
      <div className="voice-toolbar">
        <button
          type="button"
          title="Voice options"
          aria-label="Voice options"
          aria-pressed={active}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          ◉
        </button>
        {active && (
          <button type="button" title="Stop voice" aria-label="Stop voice" onClick={voice.stop}>
            ■
          </button>
        )}
      </div>
      {open && (
        <SourceDrawer label="Voice tutor" onClose={() => setOpen(false)}>
          <section className="coach-panel voice-settings">
            <header>
              <h2>A conversation, at your pace</h2>
              <button type="button" aria-label="Close voice options" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            <p>
              Hear each complete sentence as the tutor responds. Hands-free mode listens between
              turns, never while the tutor is speaking. Each question is limited to 30 seconds.
            </p>
            <label className="coach-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (!e.target.checked) voice.stop();
                }}
              />
              I understand browser dictation may use my browser provider's speech service.
              Cloudflare recordings are sent only when I choose that option.
            </label>
            <div className="coach-actions">
              <button
                type="button"
                disabled={
                  !consent || !voice.supported || props.busy || voice.listening || voice.pending
                }
                onClick={voice.beginConversation}
              >
                Start voice conversation
              </button>
              <button
                type="button"
                disabled={
                  !consent || !voice.supported || props.busy || voice.listening || voice.pending
                }
                onClick={() => voice.startRecognition(false)}
              >
                Dictate a question
              </button>
              <button
                type="button"
                disabled={!consent || props.busy || voice.listening || voice.pending}
                onClick={() => void voice.record()}
              >
                Record with Cloudflare · 30s
              </button>
              {voice.listening && (
                <button type="button" onClick={voice.stopCapture}>
                  Finish this question
                </button>
              )}
              <button type="button" disabled={!active} onClick={voice.stop}>
                Stop all voice
              </button>
            </div>
            {!voice.supported && (
              <p>
                Browser dictation is unavailable here. You can use the short recording option or
                type.
              </p>
            )}
            <label className="coach-consent">
              <input
                type="checkbox"
                checked={voice.speak}
                onChange={(e) => voice.toggleRead(e.target.checked)}
              />
              Read responses aloud
            </label>
            <p role="status" aria-live="polite">
              {voice.listening
                ? "Listening…"
                : voice.pending
                  ? "Transcribing your recording…"
                  : voice.speaking
                    ? "Tutor speaking…"
                    : voice.handsFree
                      ? "Waiting for the tutor…"
                      : "Microphone off"}
            </p>
            {voice.draft && (
              <>
                <label>
                  Review your transcript
                  <textarea
                    aria-label="Voice transcript"
                    value={voice.draft}
                    disabled={voice.handsFree || voice.listening || voice.pending}
                    maxLength={4000}
                    onChange={(e) => voice.setDraft(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    props.busy ||
                    voice.listening ||
                    voice.pending ||
                    voice.handsFree ||
                    !voice.draft.trim()
                  }
                  onClick={voice.send}
                >
                  Send transcript
                </button>
              </>
            )}
            {voice.notice && (
              <p role="status" className="coach-error">
                {voice.notice}
              </p>
            )}
            <p className="coach-privacy">
              Voice pauses when you hide this page or change session. Browser/device speech quality
              and network latency vary. You can interrupt with Stop voice and keep using text.
            </p>
          </section>
        </SourceDrawer>
      )}
    </>
  );
}

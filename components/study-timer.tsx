"use client";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth/client";
import { IDLE_MS, PULSE_MS } from "../lib/activity/time";
export function StudyTimer({
  sessionId,
  compact = false,
}: {
  sessionId: string;
  compact?: boolean;
}) {
  const { data } = authClient.useSession();
  const owner = data?.user?.id;
  const [choice, setChoice] = useState<{ owner?: string; enabled: boolean }>({ enabled: false });
  const enabled = !!owner && choice.owner === owner && choice.enabled;
  const [recorded, setRecorded] = useState<{ owner?: string; seconds: number }>({ seconds: 0 });
  const [status, setStatus] = useState("paused");
  const [retry, setRetry] = useState(0);
  const tabId = useRef("");
  const takeover = useRef(false);
  useEffect(() => {
    if (!enabled || !owner) {
      setStatus("paused");
      return;
    }
    tabId.current ||= crypto.randomUUID();
    const trackingId = tabId.current;
    let alive = true,
      running = false,
      inFlight = false,
      blocked = false,
      lastInput = Date.now(),
      lastSent = 0;
    async function send(action: "start" | "pulse" | "stop", force = false) {
      inFlight = true;
      try {
        const r = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            sessionId,
            trackingId,
            ...(force ? { takeover: true } : {}),
          }),
          signal: AbortSignal.timeout(10000),
        });
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) {
          running = false;
          if (d.error?.code === "TIMER_EXPIRED") {
            lastSent = 0;
            return;
          }
          blocked = true;
          setStatus(d.error?.code === "TIMER_ACTIVE_ELSEWHERE" ? "elsewhere" : "error");
          return;
        }
        running = d.state === "tracking";
        lastSent = Date.now();
        if (d.secondsAdded > 0) {
          setRecorded((s) => ({
            owner,
            seconds: (s.owner === owner ? s.seconds : 0) + d.secondsAdded,
          }));
          window.dispatchEvent(new Event("vela-activity"));
        }
        setStatus(running ? "tracking" : "idle");
      } catch {
        if (alive) {
          blocked = true;
          running = false;
          setStatus("error");
        }
      } finally {
        inFlight = false;
      }
    }
    function sync() {
      if (!alive || inFlight || blocked) return;
      const focused = document.visibilityState === "visible" && document.hasFocus();
      if (!focused || Date.now() - lastInput >= IDLE_MS) {
        if (running) {
          running = false;
          void send("stop");
        } else setStatus("idle");
        return;
      }
      if (!running) {
        const force = takeover.current;
        takeover.current = false;
        void send("start", force);
      } else if (Date.now() - lastSent >= PULSE_MS) void send("pulse");
    }
    const interact = () => {
      lastInput = Date.now();
      sync();
    };
    const focus = () => {
      if (document.hasFocus()) lastInput = Date.now();
      sync();
    };
    for (const event of ["pointerdown", "keydown", "wheel", "touchstart"])
      window.addEventListener(event, interact, { passive: true });
    window.addEventListener("focus", focus);
    window.addEventListener("blur", sync);
    document.addEventListener("visibilitychange", focus);
    const interval = setInterval(sync, 1000);
    sync();
    return () => {
      alive = false;
      clearInterval(interval);
      for (const event of ["pointerdown", "keydown", "wheel", "touchstart"])
        window.removeEventListener(event, interact);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", sync);
      document.removeEventListener("visibilitychange", focus);
      void fetch("/api/activity", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId, trackingId }),
      }).catch(() => {});
    };
  }, [enabled, owner, sessionId, retry]);
  const seconds = recorded.owner === owner ? recorded.seconds : 0;
  const counter = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div
      className={`study-timer ${compact ? "study-timer-compact" : ""}`}
      aria-label="Focused study timer"
    >
      <button
        type="button"
        disabled={!owner}
        title="Optional focused-time tracking. Pauses while away or idle; activity is separate from mastery."
        aria-label={enabled ? `Pause study timer · ${counter}` : "Start study timer"}
        aria-pressed={enabled}
        onClick={() => setChoice({ owner, enabled: !enabled })}
      >
        {compact
          ? enabled
            ? counter
            : "Timer"
          : enabled
            ? `Pause timer · ${counter}`
            : "Start study timer"}
      </button>
      <span role="status">
        {enabled
          ? status === "tracking"
            ? "Recording focused time"
            : status === "elsewhere"
              ? "Timer active in another tab"
              : status === "error"
                ? "Connection paused"
                : "Paused while away or idle"
          : "Optional"}
      </span>
      {enabled && ["elsewhere", "error"].includes(status) && (
        <button
          type="button"
          onClick={() => {
            takeover.current = status === "elsewhere";
            setRetry((n) => n + 1);
          }}
        >
          {status === "elsewhere" ? "Track in this tab" : "Resume timer"}
        </button>
      )}
      <details>
        <summary aria-label="About study time tracking">ⓘ</summary>
        <p>
          Counts focused, visible study time after you start. Pauses after two minutes without
          interaction, when hidden, or when you leave. One tab at a time. This is an activity
          estimate, separate from mastery and attendance.{" "}
          <a href="/activity">View your weekly goal →</a>
        </p>
      </details>
    </div>
  );
}

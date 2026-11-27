"use client";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth/client";
import { IDLE_MS, PULSE_MS } from "../lib/activity/time";
const browserTrackingIds = new Map<string, string>();
const activityEvents = [
  "pointermove",
  "pointerdown",
  "touchstart",
  "touchmove",
  "keydown",
  "input",
  "wheel",
  "scroll",
] as const;
export function StudyTimer({
  sessionId,
  compact = false,
}: {
  sessionId: string;
  compact?: boolean;
}) {
  const { data } = authClient.useSession();
  const owner = data?.user?.id;
  const [choice, setChoice] = useState<{ owner?: string; sessionId?: string; enabled: boolean }>({
    enabled: true,
  });
  const sameLesson = choice.owner === owner && choice.sessionId === sessionId;
  const enabled = !!owner && (!sameLesson || choice.enabled);
  const [recorded, setRecorded] = useState<{ owner?: string; sessionId?: string; seconds: number }>(
    { seconds: 0 },
  );
  const [status, setStatus] = useState("paused");
  const [retry, setRetry] = useState(0);
  const [returned, setReturned] = useState(false);
  const previousStatus = useRef("paused");
  useEffect(() => {
    if (previousStatus.current === "idle" && status === "tracking") {
      setReturned(true);
      const t = setTimeout(() => setReturned(false), 6000);
      previousStatus.current = status;
      return () => clearTimeout(t);
    }
    previousStatus.current = status;
    if (status !== "tracking") setReturned(false);
  }, [status]);
  useEffect(() => {
    setChoice({ owner, sessionId, enabled: true });
  }, [owner, sessionId]);
  const takeover = useRef(false);
  useEffect(() => {
    if (!enabled || !owner) {
      setStatus("paused");
      return;
    }
    const trackingId = browserTrackingIds.get(owner) ?? crypto.randomUUID();
    browserTrackingIds.set(owner, trackingId);
    let alive = true,
      running = false,
      suspended = false,
      inFlight = false,
      blocked: false | "error" | "elsewhere" = false,
      lastInput = Date.now(),
      lastSent = 0,
      lastStartAttempt = 0,
      lastTick = Date.now(),
      lastFocused = document.visibilityState === "visible" && document.hasFocus();
    let idleDeadline: ReturnType<typeof setTimeout> | undefined;
    async function send(action: "start" | "pulse" | "stop", force = false) {
      inFlight = true;
      if (action === "start") lastStartAttempt = Date.now();
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
          blocked = d.error?.code === "TIMER_ACTIVE_ELSEWHERE" ? "elsewhere" : "error";
          setStatus(blocked);
          return;
        }
        running = d.state === "tracking";
        lastSent = Date.now();
        if (d.secondsAdded > 0) window.dispatchEvent(new Event("vela-activity"));
        setStatus(running && !suspended ? "tracking" : "idle");
      } catch {
        if (alive) {
          blocked = "error";
          running = false;
          setStatus("error");
        }
      } finally {
        inFlight = false;
        if (alive) sync();
      }
    }
    function sync() {
      if (!alive) return;
      const now = Date.now();
      const focused = !suspended && document.visibilityState === "visible" && document.hasFocus();
      const elapsed =
        running && lastFocused && !blocked
          ? Math.max(0, Math.min(now, lastInput + IDLE_MS) - lastTick)
          : 0;
      lastTick = now;
      lastFocused = focused;
      if (elapsed > 0)
        setRecorded((previous) => ({
          owner,
          sessionId,
          seconds:
            (previous.owner === owner && previous.sessionId === sessionId ? previous.seconds : 0) +
            elapsed / 1000,
        }));
      if (!focused || now - lastInput >= IDLE_MS) {
        if (!blocked) setStatus("idle");
        if (running && !inFlight) {
          running = false;
          void send("stop");
        }
        return;
      }
      if (inFlight) return;
      // A departing tab may still be releasing its lease. Retry without stealing a live lease.
      if (blocked === "elsewhere" && now - lastStartAttempt >= PULSE_MS) blocked = false;
      if (blocked) return;
      if (!running) {
        const force = takeover.current;
        takeover.current = false;
        void send("start", force);
      } else if (Date.now() - lastSent >= PULSE_MS) void send("pulse");
    }
    const armIdleDeadline = () => {
      clearTimeout(idleDeadline);
      idleDeadline = setTimeout(sync, Math.max(0, lastInput + IDLE_MS - Date.now()));
    };
    const interact = () => {
      lastInput = Date.now();
      armIdleDeadline();
      if (!running) sync();
    };
    const focus = () => {
      if (document.hasFocus() && document.visibilityState === "visible") {
        suspended = false;
        lastInput = Date.now();
        armIdleDeadline();
      }
      sync();
    };
    const reconnect = () => {
      if (blocked === "error") {
        blocked = false;
        sync();
      }
    };
    for (const event of activityEvents)
      window.addEventListener(event, interact, { passive: true, capture: true });
    window.addEventListener("focus", focus);
    window.addEventListener("blur", sync);
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", focus);
    const release = () => {
      void fetch("/api/activity", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId, trackingId }),
      }).catch(() => {});
    };
    const hidePage = () => {
      suspended = true;
      running = false;
      lastTick = Date.now();
      lastFocused = false;
      setStatus("idle");
      release();
    };
    window.addEventListener("pagehide", hidePage);
    window.addEventListener("pageshow", focus);
    armIdleDeadline();
    const interval = setInterval(sync, 1000);
    sync();
    return () => {
      alive = false;
      clearInterval(interval);
      clearTimeout(idleDeadline);
      for (const event of activityEvents) window.removeEventListener(event, interact, true);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", sync);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("pagehide", hidePage);
      window.removeEventListener("pageshow", focus);
      release();
    };
  }, [enabled, owner, sessionId, retry]);
  const seconds =
    recorded.owner === owner && recorded.sessionId === sessionId ? Math.floor(recorded.seconds) : 0;
  const counter = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div
      className={`study-timer ${compact ? "study-timer-compact" : ""}`}
      aria-label="Focused study timer"
    >
      <button
        type="button"
        disabled={!owner}
        title="Starts automatically in each lesson. Pauses after 10 seconds without activity or while away; separate from mastery."
        aria-label={enabled ? `Pause study timer · ${counter}` : "Start study timer"}
        aria-pressed={enabled}
        onClick={() => setChoice({ owner, sessionId, enabled: !enabled })}
      >
        {compact
          ? enabled
            ? counter
            : "Timer"
          : enabled
            ? `Pause timer · ${counter}`
            : "Start study timer"}
      </button>
      {returned && (
        <p className="timer-return-notice" role="status">
          Welcome back — your focused timer has resumed.
        </p>
      )}
      <span role="status">
        {enabled
          ? status === "tracking"
            ? "Recording focused time"
            : status === "elsewhere"
              ? "Timer active in another tab"
              : status === "error"
                ? "Connection paused"
                : "Paused while away or idle"
          : "Manually paused"}
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
          Starts automatically when you open a lesson. Pauses after 10 seconds without mouse, touch,
          scrolling or typing activity, when hidden, or when you leave. Activity resumes it
          automatically. One tab at a time. This is an activity estimate, separate from mastery and
          attendance. <a href="/activity">View your weekly goal →</a>
        </p>
      </details>
    </div>
  );
}

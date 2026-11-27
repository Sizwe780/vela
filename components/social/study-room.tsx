"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { studentRequest } from "../../lib/student/client";
import { LiveAggregate, type LiveQuery } from "./live-aggregate";
import { pomodoro } from "../../lib/social/common";
import type { RoomCount } from "../../lib/social/room-query";
type Room = {
  ownerId: string;
  others: number;
  serverTime: number;
  live: LiveQuery<RoomCount> | null;
};
export function StudyRoom({ moduleId, ownerId }: { moduleId: string; ownerId: string }) {
  const [trackingId] = useState(() => crypto.randomUUID()),
    [joined, setJoined] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [room, setRoom] = useState<Room | null>(null),
    [others, setOthers] = useState(0),
    [status, setStatus] = useState("connecting"),
    [clock, setClock] = useState(Date.now());
  const offset = useRef(0),
    active = useRef(false),
    alive = useRef(true),
    inflight = useRef(false);
  const leaveServer = useCallback(
    () =>
      fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, moduleId, trackingId, action: "leave" }),
        keepalive: true,
      }).catch(() => {}),
    [ownerId, moduleId, trackingId],
  );
  const leave = useCallback(() => {
    active.current = false;
    setJoined(false);
    setRoom(null);
    void leaveServer();
  }, [leaveServer]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (active.current || inflight.current) void leaveServer();
    };
  }, [leaveServer]);
  const load = useCallback(
    async (live = false) => {
      const data = await studentRequest<Room>(
        `/api/rooms?moduleId=${encodeURIComponent(moduleId)}${live ? "&live=1" : ""}`,
      );
      if (alive.current) {
        offset.current = data.serverTime - Date.now();
        setOthers(data.others);
        if (live) setRoom(data);
      }
      return data;
    },
    [moduleId],
  );
  async function join() {
    if (busy || joined) return;
    setBusy(true);
    setError("");
    inflight.current = true;
    try {
      await studentRequest("/api/rooms", "POST", { ownerId, moduleId, trackingId, action: "join" });
      if (!alive.current) {
        void leaveServer();
        return;
      }
      active.current = true;
      setJoined(true);
      await load(true);
    } catch (e) {
      if (alive.current) {
        setError((e as Error).message);
        leave();
      }
    } finally {
      inflight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (!joined) return;
    if (document.hidden) {
      leave();
      return;
    }
    let stopped = false,
      working = false;
    const pulse = async () => {
      if (working || stopped || document.hidden) return;
      working = true;
      try {
        await studentRequest("/api/rooms", "POST", {
          ownerId,
          moduleId,
          trackingId,
          action: "pulse",
        });
        // Live queries cannot depend on a changing database clock. Reseal the
        // server timestamp on every heartbeat so disconnected leases age out.
        if (!stopped) await load(true);
      } catch (e) {
        if (!stopped) {
          setError((e as Error).message);
          leave();
        }
      } finally {
        working = false;
      }
    };
    const heartbeat = setInterval(() => void pulse(), 25000),
      tick = setInterval(() => setClock(Date.now() + offset.current), 1000);
    const hidden = () => {
      if (document.hidden) leave();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      clearInterval(heartbeat);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", leave);
    };
  }, [joined, ownerId, moduleId, trackingId, load, leave]);
  const onRows = useCallback((rows: readonly RoomCount[]) => setOthers(rows[0]?.others ?? 0), []);
  const refresh = useCallback(async () => {
    const data = await studentRequest<Room>(
      `/api/rooms?moduleId=${encodeURIComponent(moduleId)}&live=1&expectedOwner=${encodeURIComponent(room?.ownerId ?? "")}`,
    );
    if (!data.live) throw Error("Live room unavailable");
    return data.live.sealedQuery;
  }, [moduleId, room?.ownerId]);
  const cycle = pomodoro(clock),
    seconds = Math.ceil(cycle.remainingMs / 1000),
    time = `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <section className="study-room" aria-label="Anonymous study room">
      <h2>Study with me</h2>
      <p>
        Join quietly with enrolled peers. Only an anonymous count is shared; your name, notes and
        study activity stay private. Leaving or hiding this page ends your presence, with a
        90-second expiry if disconnected.
      </p>
      {!joined ? (
        <button type="button" disabled={busy} onClick={() => void join()}>
          {busy ? "Joining…" : "Join anonymous room"}
        </button>
      ) : (
        <>
          <p className="room-count" data-testid="room-count">
            {others} other {others === 1 ? "learner" : "learners"} active in this room
          </p>
          <small>
            {status === "live" ? "Live updates" : "Periodic updates · every 25 seconds"}
          </small>
          <div className="pomodoro" aria-label="Shared Pomodoro">
            <span>{cycle.phase}</span>
            <strong data-testid="pomodoro-time">{time}</strong>
            <p>
              Shared 25-minute focus / 5-minute break cycle. Server time synchronizes the room;
              joining does not reset it. No sounds or automatic study credit.
            </p>
          </div>
          <button type="button" onClick={leave}>
            Leave room
          </button>
          {room?.live && (
            <LiveAggregate
              key={room.ownerId}
              live={room.live}
              ownerId={room.ownerId}
              onRows={onRows}
              onStatus={setStatus}
              refresh={refresh}
            />
          )}
        </>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}

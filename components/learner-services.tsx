"use client";
import { useCallback, useEffect, useRef, useState, Component, type ReactNode } from "react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react";
import { useStudentResource } from "../lib/student/client";

type Row = { id: string; learningOutcomeId: string; score: number; attempts: number };
type Live = { userId: string; url: string; sealedQuery: SealedLiveQuery<Row> };

class RealtimeBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function LearnerServices() {
  const { data, error, userId } = useStudentResource<Live>("/api/progress/live");
  if (!userId) return null;
  return (
    <div className="dashboard-live-status" aria-label="Live learning updates">
      {data?.userId === userId ? (
        <ProgressConnection key={data.userId} live={data} />
      ) : (
        <span role="status">
          {error ? "Live updates unavailable" : "Connecting live progress…"}
        </span>
      )}
    </div>
  );
}

function ProgressConnection({ live }: { live: Live }) {
  const [client, setClient] = useState(() => createRealtimeClient({ url: live.url }));
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    setClosed(false);
    return () => {
      try {
        client.close();
      } catch {
        /* already closed */
      }
    };
  }, [client]);
  function reconnect() {
    setClient(createRealtimeClient({ url: live.url }));
    setClosed(false);
  }
  if (closed) {
    return (
      <button
        className="live-progress"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        onClick={reconnect}
      >
        Live updates paused · tap to reconnect
      </button>
    );
  }
  return (
    <RealtimeBoundary onError={() => setClosed(true)}>
      <RealtimeProvider client={client}>
        <ProgressCount live={live} />
      </RealtimeProvider>
    </RealtimeBoundary>
  );
}

function ProgressCount({ live }: { live: Live }) {
  const refreshQuery = useCallback(async () => {
    const response = await fetch(
      `/api/progress/live?expectedUserId=${encodeURIComponent(live.userId)}`,
      { cache: "no-store" },
    );
    if (response.status === 401 || response.status === 409) {
      window.location.assign("/auth/sign-in");
      throw new Error("Session changed");
    }
    if (!response.ok) throw new Error("Live progress could not reconnect.");
    return ((await response.json()) as Live).sealedQuery;
  }, [live.userId]);
  const { data, status } = useLiveQuery(live.sealedQuery, { refreshQuery });
  const last = useRef("");
  useEffect(() => {
    const signature = JSON.stringify(data);
    if (data && signature !== last.current) {
      last.current = signature;
      window.dispatchEvent(new Event("vela-progress"));
    }
  }, [data]);
  if (status === "error")
    return <span className="live-progress">Live updates paused. Reload to reconnect.</span>;
  const assessed = data?.filter((row) => row.attempts > 0).length ?? 0;
  return (
    <span className="live-progress" data-assessed-count={assessed}>
      <span className="scope-dot" />
      {data
        ? `${assessed} assessed ${assessed === 1 ? "outcome" : "outcomes"} · live`
        : "Connecting live progress…"}
    </span>
  );
}

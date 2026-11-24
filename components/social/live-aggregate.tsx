"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";
import { RealtimeProvider, useLiveQuery } from "@neon/realtime-react";
export type LiveQuery<T> = { url: string; sealedQuery: SealedLiveQuery<T> };
const clients = new Map<
  string,
  { client: ReturnType<typeof createRealtimeClient>; refs: number }
>();
function acquire(key: string, url: string) {
  let entry = clients.get(key);
  if (!entry) {
    entry = { client: createRealtimeClient({ url }), refs: 0 };
    clients.set(key, entry);
  }
  entry.refs++;
  return entry.client;
}
function release(key: string) {
  const entry = clients.get(key);
  if (entry && --entry.refs === 0) {
    entry.client.close();
    clients.delete(key);
  }
}
class Boundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function LiveAggregate<T>({
  live,
  ownerId,
  onRows,
  onStatus,
  refresh,
}: {
  live: LiveQuery<T>;
  ownerId: string;
  onRows: (rows: readonly T[]) => void;
  onStatus: (status: string) => void;
  refresh: () => Promise<SealedLiveQuery<T>>;
}) {
  const key = live.url + ":" + ownerId;
  const [client, setClient] = useState<ReturnType<typeof createRealtimeClient> | null>(null);
  useEffect(() => {
    setClient(acquire(key, live.url));
    return () => release(key);
  }, [key, live.url]);
  if (!client) return null;
  return (
    <Boundary onFailure={() => onStatus("error")}>
      <RealtimeProvider client={client}>
        <Signal live={live} onRows={onRows} onStatus={onStatus} refresh={refresh} />
      </RealtimeProvider>
    </Boundary>
  );
}
function Signal<T>({
  live,
  onRows,
  onStatus,
  refresh,
}: {
  live: LiveQuery<T>;
  onRows: (rows: readonly T[]) => void;
  onStatus: (status: string) => void;
  refresh: () => Promise<SealedLiveQuery<T>>;
}) {
  const { data, status } = useLiveQuery(live.sealedQuery, { refreshQuery: refresh });
  useEffect(() => {
    if (data) onRows(data);
  }, [data, onRows]);
  useEffect(() => onStatus(status), [status, onStatus]);
  return null;
}

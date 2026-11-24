"use client";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "../auth/client";
export async function studentRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(url, {
    method,
    cache: "no-store",
    signal,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const d = await r.json();
  if (!r.ok) throw Object.assign(Error(d.error?.message ?? "Please retry."), { status: r.status });
  return d as T;
}
export const studentNavUpdate = "vela:student-navigation-updated";

export function useStudentResource<T>(url: string | null) {
  const { data: session, isPending } = authClient.useSession();
  const owner = session?.user?.id;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    owner?: string;
    url: string | null;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ url: null, data: null, error: "", loading: true });
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!owner || !url) {
      setState({ owner, url, data: null, error: "", loading: false });
      return;
    }
    const c = new AbortController();
    setState((s) => ({
      owner,
      url,
      data: s.owner === owner && s.url === url ? s.data : null,
      error: "",
      loading: true,
    }));
    void studentRequest<T>(url, "GET", undefined, c.signal)
      .then((data) => {
        if (!c.signal.aborted) setState({ owner, url, data, error: "", loading: false });
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setState((s) => ({
            ...s,
            error: e instanceof Error ? e.message : "Please retry.",
            loading: false,
          }));
      });
    return () => c.abort();
  }, [url, owner, revision]);
  const current = state.owner === owner && state.url === url;
  return {
    data: current ? state.data : null,
    error: current ? state.error : "",
    loading: isPending || !current || state.loading,
    reload,
    userId: owner,
  };
}

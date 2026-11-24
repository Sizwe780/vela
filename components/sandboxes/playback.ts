"use client";
import { useEffect, useRef, useState } from "react";
export function usePlayback(onFrame: (fraction: number) => void, duration = 4000) {
  const callback = useRef(onFrame);
  callback.current = onFrame;
  const [playing, setPlaying] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(query.matches);
      if (query.matches) setPlaying(false);
    };
    change();
    query.addEventListener("change", change);
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      query.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    let id = 0,
      start: number | undefined,
      last = 0;
    const frame = (time: number) => {
      start ??= time;
      const t = Math.min(1, (time - start) / duration);
      if (time - last >= 32 || t === 1) {
        last = time;
        callback.current(t);
      }
      if (t < 1) id = requestAnimationFrame(frame);
      else setPlaying(false);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [playing, reduced, duration]);
  return {
    playing,
    reduced,
    start: () => {
      if (!reduced && !document.hidden) setPlaying(true);
    },
    stop: () => setPlaying(false),
  };
}

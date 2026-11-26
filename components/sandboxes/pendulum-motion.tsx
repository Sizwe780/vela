"use client";
import { useEffect, useRef, useState } from "react";
export function PendulumMotion({
  length,
  angle,
  period,
}: {
  length: number;
  angle: number;
  period: number;
}) {
  const group = useRef<SVGGElement>(null),
    frame = useRef<SVGSVGElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!media.matches);
    const sync = () => setPlaying(!media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    let id = 0,
      start = 0,
      visible = true;
    const update = (time: number) => {
      if (!start) start = time;
      const theta = angle * Math.cos((2 * Math.PI * ((time - start) / 1000)) / period);
      group.current?.setAttribute("transform", `rotate(${-theta} 190 20)`);
      if (playing && visible && !document.hidden) id = requestAnimationFrame(update);
    };
    const sync = () => {
      cancelAnimationFrame(id);
      start = 0;
      if (playing && visible && !document.hidden) id = requestAnimationFrame(update);
      else group.current?.setAttribute("transform", `rotate(${-angle} 190 20)`);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    });
    if (frame.current) observer.observe(frame.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [playing, length, angle, period]);
  const rope = 40 + (length / 1.5) * 110;
  return (
    <div className="pendulum-stage">
      <svg
        ref={frame}
        viewBox="0 0 380 210"
        role="img"
        aria-label="Animated small-angle pendulum; longer strings swing more slowly"
      >
        <path
          d="M155 20h70 M190 20v165"
          stroke="currentColor"
          strokeDasharray="4 4"
          opacity=".35"
        />
        <g ref={group}>
          <path d={`M190 20v${rope}`} stroke="currentColor" strokeWidth="2.5" />
          <circle cx="190" cy={20 + rope} r="12" fill="var(--accent, #285849)" />
        </g>
        <circle cx="190" cy="20" r="4" fill="currentColor" />
      </svg>
      <button type="button" aria-pressed={playing} onClick={() => setPlaying((v) => !v)}>
        {playing ? "Pause motion" : "Play motion"}
      </button>
      <small>
        Small-angle model · motion pauses off-screen. Record several lengths to investigate the
        relationship.
      </small>
    </div>
  );
}

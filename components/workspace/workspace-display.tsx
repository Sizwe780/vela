"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

const presets = { reader: 70, split: 50, theater: 30 } as const;
type Preset = keyof typeof presets;
const min = 28;
const max = 74;
const storageKey = "vela-workspace-split";
const clamp = (value: number) => Math.min(max, Math.max(min, Math.round(value)));

export function useWorkspaceLayout() {
  const [width, setWidth] = useState<number>(presets.split);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null && Number.isFinite(Number(saved))) setWidth(clamp(Number(saved)));
    } catch {}
  }, []);
  function update(value: number, save: boolean) {
    const next = clamp(value);
    setWidth(next);
    if (save) {
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {}
    }
  }
  const layout =
    (Object.keys(presets) as Preset[]).find((key) => presets[key] === width) ?? "custom";
  return {
    width,
    layout,
    update,
    select(value: string) {
      if (Object.hasOwn(presets, value)) update(presets[value as Preset], true);
    },
    style: {
      "--reader-share": `${width}fr`,
      "--companion-share": `${100 - width}fr`,
    } as CSSProperties,
  };
}

export function WorkspaceDivider({
  width,
  onResize,
}: {
  width: number;
  onResize: (width: number, save: boolean) => void;
}) {
  const dragging = useRef<number | null>(null);
  const latest = useRef(width);
  const [active, setActive] = useState(false);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId !== dragging.current) return;
    const divider = event.currentTarget;
    const frame = divider.parentElement!;
    const rect = frame.getBoundingClientRect();
    const styles = getComputedStyle(frame);
    const left = rect.left + parseFloat(styles.paddingLeft);
    const available =
      frame.clientWidth -
      parseFloat(styles.paddingLeft) -
      parseFloat(styles.paddingRight) -
      divider.offsetWidth;
    latest.current = clamp((100 * (event.clientX - left - divider.offsetWidth / 2)) / available);
    onResize(latest.current, false);
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId !== dragging.current) return;
    dragging.current = null;
    setActive(false);
    onResize(latest.current, true);
  }
  function resizeWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 5 : 1;
    const values: Record<string, number> = {
      ArrowLeft: width - step,
      ArrowRight: width + step,
      Home: min,
      End: max,
    };
    if (!Object.hasOwn(values, event.key)) return;
    event.preventDefault();
    onResize(values[event.key], true);
  }
  return (
    <div
      className="workspace-divider"
      role="separator"
      aria-label="Resize reader and companion"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      aria-valuetext={`Reader ${width}%, companion ${100 - width}%`}
      aria-controls="workspace-reader workspace-companion"
      tabIndex={0}
      title="Drag to resize, or use the arrow keys"
      data-dragging={active || undefined}
      onPointerDown={(event) => {
        if (event.button !== 0 || dragging.current !== null) return;
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = event.pointerId;
        latest.current = width;
        setActive(true);
      }}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={resizeWithKeys}
    >
      <span aria-hidden="true" />
    </div>
  );
}

export function useWorkspaceFocus() {
  const workspace = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const native = useRef(false);
  useEffect(() => {
    const root = workspace.current;
    const sync = () => {
      if (document.fullscreenElement === root) native.current = true;
      else if (native.current) {
        native.current = false;
        setFocused(false);
      }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (root && document.fullscreenElement === root)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!focused) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !native.current && !document.querySelector("dialog[open]"))
        setFocused(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [focused]);
  function toggle() {
    const root = workspace.current;
    if (focused) {
      setFocused(false);
      if (root && document.fullscreenElement === root)
        void document.exitFullscreen().catch(() => {});
      return;
    }
    setFocused(true);
    if (root?.requestFullscreen && !document.fullscreenElement)
      void root.requestFullscreen().catch(() => {});
  }
  return { workspace, focused, toggle };
}

"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SourceDrawer } from "./source-drawer";
export function MobileTools({
  label = "Learning tools",
  maxWidth = 380,
  children,
}: {
  label?: string;
  maxWidth?: number;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const compactQuery = `(max-width: ${maxWidth}px)`;
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => {
      if (window.matchMedia(compactQuery).matches && !document.querySelector("dialog[open]"))
        trigger.current?.focus();
    });
  };
  useEffect(() => {
    const closeForMaster = () => setOpen(false);
    window.addEventListener("vela-open-master", closeForMaster);
    return () => window.removeEventListener("vela-open-master", closeForMaster);
  }, []);
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia(compactQuery);
    const resized = () => {
      if (!query.matches) setOpen(false);
    };
    query.addEventListener("change", resized);
    return () => query.removeEventListener("change", resized);
  }, [compactQuery, open]);
  return (
    <>
      <button
        type="button"
        className="mobile-tools-trigger"
        ref={trigger}
        aria-label="More tools"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>
      {open && (
        <SourceDrawer id={id} label={label} onClose={close}>
          <section
            className="mobile-tools-panel"
            onKeyDown={(e) => {
              if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
              const items = [
                ...e.currentTarget.querySelectorAll<HTMLElement>(
                  "button,a[href],select,input,textarea,[tabindex]",
                ),
              ].filter(
                (el) =>
                  el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0,
              );
              const first = items[0],
                last = items.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a[href]")) close();
            }}
          >
            <header>
              <h2>{label}</h2>
              <button type="button" aria-label="Close tools" onClick={close}>
                ×
              </button>
            </header>
            {typeof children === "function" ? children(close) : children}
          </section>
        </SourceDrawer>
      )}
    </>
  );
}

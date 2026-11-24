"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LearningNav } from "./learning-nav";
import { SourceDrawer } from "./source-drawer";

export function NavigationDrawer() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => {
      if (!document.querySelector("dialog[open]")) trigger.current?.focus();
    });
  };

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="learning-mobile-navigation">
      <button
        ref={trigger}
        type="button"
        className="learning-menu-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open learning navigation"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {open && (
        <SourceDrawer label="Learning navigation menu" onClose={close}>
          <div className="learning-navigation-drawer">
            <header>
              <h2>Navigate Vela</h2>
              <button type="button" onClick={close} aria-label="Close learning navigation">
                ×
              </button>
            </header>
            <LearningNav rail onNavigate={close} />
          </div>
        </SourceDrawer>
      )}
    </div>
  );
}

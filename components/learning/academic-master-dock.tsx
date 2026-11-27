"use client";
import { useEffect, useRef, useState } from "react";
import { SourceDrawer } from "../source-drawer";
import { LearningPanel } from "./learning-panel";
type Scope = { moduleId?: string; conceptId?: string };
export function AcademicMasterDock() {
  const [scope, setScope] = useState<Scope | null>(null),
    previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const open = (event: Event) => {
      window.dispatchEvent(new Event("vela-stop-audio"));
      previous.current = document.activeElement as HTMLElement;
      const detail = (event as CustomEvent<Scope>).detail;
      setScope({
        moduleId: typeof detail?.moduleId === "string" ? detail.moduleId : undefined,
        conceptId: typeof detail?.conceptId === "string" ? detail.conceptId : undefined,
      });
    };
    const key = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]") &&
        !(
          event.target instanceof Element &&
          event.target.closest("input,textarea,[contenteditable=true]")
        )
      ) {
        event.preventDefault();
        open(new CustomEvent("vela-open-master"));
      }
    };
    window.addEventListener("vela-open-master", open);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("vela-open-master", open);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const close = () => {
    setScope(null);
    requestAnimationFrame(() => {
      const target = previous.current?.isConnected
        ? previous.current
        : document.getElementById("main-content");
      target?.focus({ preventScroll: true });
    });
  };
  return (
    scope && (
      <SourceDrawer label="Academic Master briefing" onClose={close}>
        <div className="master-dock">
          <header>
            <div>
              <span className="eyebrow">ACADEMIC MASTER</span>
              <h2>Your learning, in context</h2>
            </div>
            <button type="button" onClick={close} aria-label="Close Academic Master">
              Close
            </button>
          </header>
          <p>
            Use prerequisite checks and your own availability to choose a next step. Your current
            lesson stays open.
          </p>
          <LearningPanel moduleId={scope.moduleId} initialConcept={scope.conceptId} />
        </div>
      </SourceDrawer>
    )
  );
}

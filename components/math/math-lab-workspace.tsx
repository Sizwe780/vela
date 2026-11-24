"use client";

import { useState } from "react";
import type { ModuleCapabilities } from "../../lib/capabilities";
import { useStudentResource } from "../../lib/student/client";
import { SandboxGallery } from "../sandboxes/gallery";
import { MathLabLoader } from "./math-lab-loader";

export function MathLabWorkspace({
  openNotebook,
  openVisuals,
}: {
  openNotebook: boolean;
  openVisuals: boolean;
}) {
  const { data, error } = useStudentResource<{ capabilities: ModuleCapabilities }>(
    "/api/capabilities",
  );
  const [chosen, setChosen] = useState(openVisuals);
  const [openedScratchpad, setOpenedScratchpad] = useState(!openVisuals);
  const capabilities = data?.capabilities;
  const hasVisuals = capabilities?.matrix || capabilities?.calculus;
  const showingVisuals = chosen && !error && (!data || hasVisuals);

  return (
    <div className="math-lab-workspace">
      {hasVisuals && (
        <div className="vela-switcher" role="group" aria-label="Math Lab view">
          <button
            type="button"
            aria-pressed={!showingVisuals}
            onClick={() => {
              setOpenedScratchpad(true);
              setChosen(false);
            }}
          >
            Scratchpad
          </button>
          <button type="button" aria-pressed={showingVisuals} onClick={() => setChosen(true)}>
            Visual sandboxes
          </button>
        </div>
      )}
      {(openedScratchpad || !showingVisuals) && (
        <div hidden={showingVisuals}>
          <MathLabLoader openNotebook={openNotebook} />
        </div>
      )}
      {showingVisuals &&
        (capabilities ? (
          <section className="math-visual-workbench" aria-labelledby="math-visual-title">
            <header>
              <h2 id="math-visual-title">Visual sandboxes</h2>
              <p>Make a prediction, change a parameter, and explain what happened.</p>
            </header>
            <SandboxGallery capabilities={capabilities} />
          </section>
        ) : (
          <p role="status">Loading the sandboxes for your modules…</p>
        ))}
    </div>
  );
}

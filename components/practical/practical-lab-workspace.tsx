"use client";

import { useState } from "react";
import type { ModuleCapabilities } from "../../lib/capabilities";
import { useStudentResource } from "../../lib/student/client";
import { SandboxGallery } from "../sandboxes/gallery";
import { MathLabLoader } from "../math/math-lab-loader";
import { QuantityCheck } from "./quantity-check";

export function PracticalLabWorkspace({
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
  const [converter, setConverter] = useState(false);
  const [openedScratchpad, setOpenedScratchpad] = useState(!openVisuals);
  const capabilities = data?.capabilities;
  const hasMathTools = capabilities?.math || capabilities?.matrix || capabilities?.calculus;
  const hasVisuals =
    capabilities?.matrix ||
    capabilities?.calculus ||
    capabilities?.molecules ||
    capabilities?.reactions;
  const showingVisuals =
    (chosen || (!hasMathTools && hasVisuals)) && !error && (!data || hasVisuals);

  return (
    <div className="practical-lab-workspace">
      {(hasMathTools || hasVisuals || capabilities?.units) && (
        <div className="vela-switcher" role="group" aria-label="Practical Lab tools">
          {capabilities?.math && (
            <button
              type="button"
              aria-pressed={!showingVisuals && !converter}
              onClick={() => {
                setConverter(false);
                setOpenedScratchpad(true);
                setChosen(false);
              }}
            >
              Mathematical scratchpad
            </button>
          )}
          {hasVisuals && (
            <button
              type="button"
              aria-pressed={showingVisuals && !converter && !converter}
              onClick={() => {
                setConverter(false);
                setChosen(true);
              }}
            >
              Visual simulations
            </button>
          )}
          {capabilities?.units && (
            <button type="button" aria-pressed={converter} onClick={() => setConverter(true)}>
              Unit converter
            </button>
          )}
        </div>
      )}
      {hasMathTools && (openedScratchpad || !showingVisuals) && (
        <div hidden={showingVisuals || converter}>
          <MathLabLoader openNotebook={openNotebook} />
        </div>
      )}
      {showingVisuals &&
        !converter &&
        (capabilities ? (
          <section className="math-visual-workbench" aria-labelledby="practical-visual-title">
            <header>
              <h2 id="practical-visual-title">Visual simulations</h2>
              <p>Make a prediction, change a parameter, and explain what happened.</p>
            </header>
            <SandboxGallery capabilities={capabilities} />
          </section>
        ) : (
          <p role="status">Loading practical tools for your modules…</p>
        ))}
      {capabilities?.units && (converter || !hasMathTools) && <QuantityCheck />}
      {!data && <p role="status">{error || "Loading the practical tools for your modules…"}</p>}
      {data && !hasMathTools && !capabilities?.units && (
        <p>
          No practical tools are registered for your current modules. Your lessons and active recall
          remain available.
        </p>
      )}
    </div>
  );
}

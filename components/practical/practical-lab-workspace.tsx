"use client";

import dynamic from "next/dynamic";
const ReferenceDrawer = dynamic(() => import("../references/reference-drawer"), { ssr: false });
import { useState } from "react";
import type { ModuleCapabilities } from "../../lib/capabilities";
import { useStudentResource } from "../../lib/student/client";
import { SandboxGallery } from "../sandboxes/gallery";
import { MathLabLoader } from "../math/math-lab-loader";
import { ScientificCalculator } from "./scientific-calculator";
import { QuantityCheck } from "./quantity-check";

export function PracticalLabWorkspace({
  openNotebook,
  openVisuals,
}: {
  openNotebook: boolean;
  openVisuals: boolean;
}) {
  const { data, error, userId } = useStudentResource<{
    capabilities: ModuleCapabilities;
    modules?: { code: string; institution: string; capabilities: ModuleCapabilities }[];
  }>("/api/capabilities");
  const [referenceOpen, setReferenceOpen] = useState(false),
    [referenceModule, setReferenceModule] = useState(""),
    [referenceNotice, setReferenceNotice] = useState("");
  const [chosen, setChosen] = useState(openVisuals);
  const [calculator, setCalculator] = useState(false);
  const [openedCalculator, setOpenedCalculator] = useState(false);
  const [converter, setConverter] = useState(false);
  const [openedScratchpad, setOpenedScratchpad] = useState(!openVisuals);
  const capabilities = data?.capabilities;
  const hasMathTools = capabilities?.math || capabilities?.matrix || capabilities?.calculus;
  const hasVisuals =
    capabilities?.matrix ||
    capabilities?.calculus ||
    capabilities?.molecules ||
    capabilities?.reactions;
  const hasCalculator = hasMathTools || hasVisuals || capabilities?.units || capabilities?.physics;
  const showingVisuals =
    (chosen || (!hasMathTools && hasVisuals)) &&
    !calculator &&
    !converter &&
    !error &&
    (!data || hasVisuals);

  const selectedRef = data?.modules?.find((m) => m.institution + ":" + m.code === referenceModule);
  return (
    <div className="practical-lab-workspace">
      {capabilities && (hasMathTools || hasVisuals || capabilities.units) && (
        <div className="lab-reference-actions">
          <button type="button" onClick={() => setReferenceOpen(true)}>
            Quick references
          </button>
          {!!data?.modules?.length && (
            <label>
              Reference module
              <select value={referenceModule} onChange={(e) => setReferenceModule(e.target.value)}>
                <option value="">General lookup</option>
                {data.modules.map((m) => (
                  <option key={m.institution + m.code} value={m.institution + ":" + m.code}>
                    {m.code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span role="status">{referenceNotice}</span>
        </div>
      )}
      {referenceOpen && capabilities && (
        <ReferenceDrawer
          key={userId}
          initial={
            capabilities.molecules
              ? "periodic"
              : capabilities.physics || capabilities.units
                ? "constants"
                : "formulas"
          }
          moduleCode={selectedRef?.code ?? ""}
          institution={selectedRef?.institution ?? ""}
          chemistry={capabilities.molecules || capabilities.reactions}
          physics={capabilities.physics}
          math={capabilities.math}
          onClose={() => setReferenceOpen(false)}
          onInsert={(text) => {
            if (hasMathTools && !showingVisuals && !converter && !calculator) {
              window.dispatchEvent(new CustomEvent("vela-reference-insert", { detail: text }));
              setReferenceNotice("Reference inserted into your next scratchpad line.");
            } else {
              void navigator.clipboard?.writeText(text);
              setReferenceNotice("Reference copied. Paste it into your working when ready.");
            }
          }}
        />
      )}

      {(hasMathTools || hasVisuals || capabilities?.units) && (
        <div className="vela-switcher" role="group" aria-label="Practical Lab tools">
          {capabilities?.math && (
            <button
              type="button"
              aria-pressed={!showingVisuals && !converter && !calculator}
              onClick={() => {
                setCalculator(false);
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
              aria-pressed={showingVisuals}
              onClick={() => {
                setCalculator(false);
                setConverter(false);
                setChosen(true);
              }}
            >
              Visual simulations
            </button>
          )}
          {capabilities?.units && (
            <button
              type="button"
              aria-pressed={converter}
              onClick={() => {
                setCalculator(false);
                setConverter(true);
              }}
            >
              Unit converter
            </button>
          )}
          {hasCalculator && (
            <button
              type="button"
              aria-pressed={calculator}
              onClick={() => {
                setCalculator(true);
                setOpenedCalculator(true);
                setConverter(false);
              }}
            >
              Scientific calculator
            </button>
          )}
        </div>
      )}
      {openedCalculator && (
        <div hidden={!calculator}>
          <ScientificCalculator key={userId} />
        </div>
      )}
      {hasMathTools && (openedScratchpad || !showingVisuals) && (
        <div hidden={showingVisuals || converter || calculator}>
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
      {capabilities?.units && (converter || (!hasMathTools && !hasVisuals && !calculator)) && (
        <QuantityCheck />
      )}
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

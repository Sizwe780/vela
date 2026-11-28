"use client";
import { useContext, useState } from "react";
import dynamic from "next/dynamic";
import { useModuleCapabilities } from "../module-capabilities";
import { PracticeSessionContext } from "../written-practice";
const Drawer = dynamic(() => import("./reference-drawer"), { ssr: false });
export function ExerciseReferences({ onInsert }: { onInsert: (text: string) => void }) {
  const c = useModuleCapabilities(),
    session = useContext(PracticeSessionContext),
    [open, setOpen] = useState("");
  if (!c.math && !c.molecules && !c.physics && !c.units && !c.reactions) return null;
  return (
    <>
      <div className="exercise-reference-chips" role="group" aria-label="Question reference tools">
        {(c.molecules || c.reactions) && (
          <button type="button" onClick={() => setOpen("periodic")}>
            Periodic table
          </button>
        )}
        {(c.physics || c.units || c.molecules) && (
          <button type="button" onClick={() => setOpen("constants")}>
            Constants & units
          </button>
        )}
        <button type="button" onClick={() => setOpen("calculator")}>
          Calculator
        </button>
        <button type="button" onClick={() => setOpen("formulas")}>
          Formula sheet
        </button>
      </div>
      {open && (
        <Drawer
          initial={open}
          moduleCode={session?.moduleCode ?? ""}
          institution={session?.moduleInstitution ?? ""}
          chemistry={c.molecules || c.reactions}
          physics={c.physics}
          math={c.math}
          onInsert={onInsert}
          onClose={() => setOpen("")}
        />
      )}
    </>
  );
}

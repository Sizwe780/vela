"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { ModuleCapabilities } from "../../lib/capabilities";
import { useModuleCapabilities } from "../module-capabilities";
const Matrix = dynamic(() => import("./matrix-sandbox").then((m) => m.MatrixSandbox), {
  ssr: false,
});
const Riemann = dynamic(() => import("./riemann-sandbox").then((m) => m.RiemannSandbox), {
  ssr: false,
});
const Limit = dynamic(() => import("./limit-sandbox").then((m) => m.LimitSandbox), { ssr: false });
const Molecular = dynamic(() => import("./molecular-geometry").then((m) => m.MolecularGeometry), {
  ssr: false,
});
const Reaction = dynamic(() => import("./reaction-classes").then((m) => m.ReactionClasses), {
  ssr: false,
});
export function SandboxGallery({ capabilities }: { capabilities?: ModuleCapabilities }) {
  const scoped = useModuleCapabilities(),
    c = capabilities ?? scoped;
  const defaultTab = c.reactions
    ? "reactions"
    : c.matrix
      ? "matrix"
      : c.calculus
        ? "riemann"
        : c.molecules
          ? "molecules"
          : "none";
  const [chosen, setTab] = useState(defaultTab);
  const available = c.reactions || c.molecules || c.matrix || c.calculus;
  const tab = {
    matrix: c.matrix,
    riemann: c.calculus,
    limit: c.calculus,
    molecules: c.molecules,
    reactions: c.reactions,
  }[chosen as "matrix" | "riemann" | "limit" | "molecules" | "reactions"]
    ? chosen
    : defaultTab;
  if (!available) return <p>No visual sandboxes are registered for your current modules.</p>;
  return (
    <section className="sandbox-gallery">
      <div className="sandbox-tabs" role="group" aria-label="Visual sandbox">
        {c.matrix && (
          <button type="button" aria-pressed={tab === "matrix"} onClick={() => setTab("matrix")}>
            Matrix transformations
          </button>
        )}
        {c.calculus && (
          <>
            <button
              type="button"
              aria-pressed={tab === "riemann"}
              onClick={() => setTab("riemann")}
            >
              Riemann sums
            </button>
            <button type="button" aria-pressed={tab === "limit"} onClick={() => setTab("limit")}>
              Limit zoom
            </button>
          </>
        )}
        {c.molecules && (
          <button
            type="button"
            aria-pressed={tab === "molecules"}
            onClick={() => setTab("molecules")}
          >
            Molecular geometry
          </button>
        )}
        {c.reactions && (
          <button
            type="button"
            aria-pressed={tab === "reactions"}
            onClick={() => setTab("reactions")}
          >
            Reaction practice
          </button>
        )}
      </div>
      {tab === "matrix" ? (
        <Matrix />
      ) : tab === "riemann" ? (
        <Riemann />
      ) : tab === "limit" ? (
        <Limit />
      ) : tab === "molecules" ? (
        <Molecular />
      ) : tab === "reactions" ? (
        <Reaction initial="equation-balancing" />
      ) : null}
    </section>
  );
}

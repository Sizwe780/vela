"use client";
import dynamic from "next/dynamic";
import { useModuleCapabilities } from "./module-capabilities";
import { widgetCapability, type LessonWidget } from "../lib/content/widget-registry";
import { chemistryExplorations } from "../lib/content/chemistry-explorations";
import { linearExplorations } from "../lib/content/linear-explorations";

const Explorer = dynamic(() => import("./sandboxes/lesson-explorer").then((m) => m.LessonExplorer));
const Overlap = dynamic(() => import("./sandboxes/orbital-overlap").then((m) => m.OrbitalOverlap));
const Linear = dynamic(() => import("./linear-session-visual").then((m) => m.LinearSessionVisual));
const Matrix = dynamic(() => import("./sandboxes/matrix-sandbox").then((m) => m.MatrixSandbox));
const Preset = dynamic(() => import("./session-visual").then((m) => m.SessionVisual));
const Curve = dynamic(() => import("./sandboxes/calculus-curve").then((m) => m.CalculusCurve));
const Plane = dynamic(() => import("./sandboxes/spatial-plane").then((m) => m.SpatialPlane));
const Energy = dynamic(() => import("./sandboxes/reaction-energy").then((m) => m.ReactionEnergy));
const PhysicsWorkshop = dynamic(() =>
  import("./sandboxes/physics-workshop").then((m) => m.PhysicsWorkshop),
);

const Framework = dynamic(() => import("./teaching-framework").then((m) => m.TeachingFramework));

const Molecule = dynamic(() =>
  import("./sandboxes/molecular-geometry").then((m) => m.MolecularGeometry),
);
const Reaction = dynamic(() =>
  import("./sandboxes/reaction-classes").then((m) => m.ReactionClasses),
);
const Density = dynamic(() => import("./sandboxes/density-sandbox").then((m) => m.DensitySandbox));
const Riemann = dynamic(() => import("./sandboxes/riemann-sandbox").then((m) => m.RiemannSandbox));

export function GenericSandboxFrame({ widget }: { widget: LessonWidget }) {
  const capabilities = useModuleCapabilities();
  if (!capabilities[widgetCapability(widget)]) return null;
  switch (widget.type) {
    case "physics_workshop":
      return <PhysicsWorkshop key={widget.config.model} model={widget.config.model} />;
    case "reaction_energy":
      return <Energy />;
    case "lesson_preset":
      return <Preset kind={widget.config.model} />;
    case "calculus_curve":
      return <Curve key={widget.config.model} model={widget.config.model} />;
    case "spatial_plane":
      return <Plane key={widget.config.mode} mode={widget.config.mode} />;
    case "linear_exploration":
      return <Explorer key={widget.config.model} model={linearExplorations[widget.config.model]} />;
    case "chemistry_exploration":
      return (
        <Explorer key={widget.config.model} model={chemistryExplorations[widget.config.model]} />
      );
    case "linear_model":
      return <Linear key={widget.config.model} kind={widget.config.model} />;
    case "matrix_transform":
      return (
        <Matrix
          initialMatrix={[widget.config.a, widget.config.b, widget.config.c, widget.config.d]}
        />
      );
    case "orbital_overlap":
      return <Overlap />;
    case "teaching_framework":
      return <Framework framework={widget.config.framework} />;
    case "vsepr_geometry":
      return <Molecule initialMolecule={widget.config.molecule} />;
    case "reaction_balance":
      return (
        <Reaction
          initialReaction={widget.config.reaction}
          initialCoefficients={[widget.config.a, widget.config.b, widget.config.c]}
        />
      );
    case "density_model":
      return <Density initialMass={widget.config.mass} initialVolume={widget.config.volume} />;
    case "riemann_sum":
      return (
        <Riemann
          initialCoefficients={[
            widget.config.quadratic,
            widget.config.linear,
            widget.config.constant,
          ]}
          initialBounds={[widget.config.start, widget.config.end]}
        />
      );
  }
}

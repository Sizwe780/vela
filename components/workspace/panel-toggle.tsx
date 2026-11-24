import { Icon } from "../icons";
export function PanelToggle({
  panel,
  onChange,
}: {
  panel: "reader" | "tutor";
  onChange: (panel: "reader" | "tutor") => void;
}) {
  return (
    <nav className="mobile-panel-switch" aria-label="Workspace panel">
      <button type="button" aria-pressed={panel === "reader"} onClick={() => onChange("reader")}>
        <Icon name="book" size={16} />
        Study material
      </button>
      <button type="button" aria-pressed={panel === "tutor"} onClick={() => onChange("tutor")}>
        <Icon name="sparkle" size={16} />
        Learning companion
      </button>
    </nav>
  );
}

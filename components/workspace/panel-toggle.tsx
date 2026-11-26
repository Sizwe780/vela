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
      <button type="button" aria-label="Study material" aria-pressed={panel === "reader"} onClick={() => onChange("reader")}>
        <Icon name="book" size={16} />
        <span>Read</span>
      </button>
      <button type="button" aria-label="Learning companion" aria-pressed={panel === "tutor"} onClick={() => onChange("tutor")}>
        <Icon name="sparkle" size={16} />
        <span>Companion</span>
      </button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("vela-open-recall"))}>
        Recall
      </button>
    </nav>
  );
}

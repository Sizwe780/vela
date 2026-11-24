"use client";
import dynamic from "next/dynamic";
import { ExerciseMarkdown } from "../../../../components/exercise-markdown";
import { Markdown } from "../../../../components/markdown";
import { companionCards } from "../../../../lib/tutor/cards";
import type { Citation } from "../../../../lib/tutor/types";
import { useModuleCapabilities } from "../../../../components/module-capabilities";
import { permitsWidget } from "../../../../lib/capabilities";
import { normalizeMath } from "../../../../lib/content/math";
const Graph = dynamic(() => import("./ChatWidget").then((m) => m.ChatWidget), {
  loading: () => <p>Loading interactive graph…</p>,
});
export function CompanionAnswer({
  text,
  citations,
  onCitation,
  onClip,
}: {
  text: string;
  citations: Citation[];
  onCitation: (id: string) => void;
  onClip?: (title: string, text: string) => void;
}) {
  const result = companionCards(normalizeMath(text));
  const capabilities = useModuleCapabilities();
  return (
    <>
      {result.cards.map((card, i) => (
        <section className="companion-card" key={i}>
          <div className="answer-card-header">
            <h3>{card.title}</h3>
            {onClip && <button onClick={() => onClip(card.title, card.text)}>Clip to Notes</button>}
          </div>
          <ExerciseMarkdown text={card.text} citations={citations} onCitation={onCitation} />
        </section>
      ))}
      {result.widgets
        .filter((widget) => permitsWidget(capabilities, widget.type))
        .map((widget, i) => (
          <section className="companion-card widget-card" key={i}>
            <p>
              {widget.data.label ??
                (widget.type === "matrix"
                  ? "Matrix transformation exploration"
                  : widget.type === "riemann"
                    ? "Riemann sum exploration"
                    : widget.type === "limitzoom"
                      ? "Two-sided limit exploration"
                      : widget.type === "vector"
                        ? "Vector exploration"
                        : "Interactive quadratic exploration")}
            </p>
            <Graph {...widget} />
          </section>
        ))}
    </>
  );
}

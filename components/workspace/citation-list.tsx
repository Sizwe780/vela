import type { Citation } from "../../lib/tutor/types";
import { Icon } from "../icons";

export function CitationList({
  citations,
  preview,
  onCitation,
}: {
  citations: Citation[];
  preview: boolean;
  onCitation: (id: string) => void;
}) {
  return (
    <details className="citations">
      <summary>
        <Icon name="link" size={13} />
        {citations.length} retrieved {citations.length === 1 ? "source" : "sources"}
        <span>Textbook & criteria</span>
      </summary>
      <div>
        {citations.map((source) => (
          <article className="citation-card" key={source.chunkId}>
            <a
              href={source.url}
              onClick={(event) => {
                event.preventDefault();
                onCitation(source.chunkId);
              }}
            >
              <span className="citation-label">{source.label}</span>
              <strong>{source.title}</strong>
              <Icon name="arrow" size={13} />
            </a>
            <p>
              {source.excerpt.slice(0, 150)}
              {source.excerpt.length > 150 ? "…" : ""}
            </p>
            <span className="criterion-chip">
              {preview
                ? "Illustrative"
                : source.criterion.authority === "SAQA_VERIFIED"
                  ? "SAQA"
                  : "Curriculum"}{" "}
              · {source.criterion.code}
            </span>
            {source.sourceUrl?.startsWith("/api/sources/") && (
              <a
                className="original-page-link"
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Original PDF page ↗
              </a>
            )}
            {!preview && (
              <span className="qualification-ref">
                Qualification SAQA ID {source.criterion.saqaId}
              </span>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}

import { SavePassageButton } from "../save-passage-button";
import type { StudyUnitView } from "../../lib/tutor/types";
import { Icon } from "../icons";
import { Markdown } from "../markdown";
import { DiscussionScope } from "../social/discussion-scope";
export function SourceDrawerContent({
  studyUnitId,
  chunk,
  preview,
  onClose,
}: {
  studyUnitId: string;
  chunk: StudyUnitView["chunks"][number];
  preview: boolean;
  onClose: () => void;
}) {
  return (
    <aside className="selected-source" id={`chunk-${chunk.id}`} tabIndex={-1}>
      <div className="source-topline">
        <span>
          <Icon name="link" size={14} />
          LEARNING SOURCE
        </span>
        <button type="button" aria-label="Close source excerpt" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <h3>{chunk.title}</h3>
      {!preview && (
        <SavePassageButton
          studyUnitId={studyUnitId}
          sourceType="chunk"
          sourceId={chunk.id}
          label="Bookmark source"
        />
      )}
      {chunk.sourceUrl?.startsWith("/api/sources/") && (
        <a
          className="original-page-link"
          href={chunk.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original PDF page ↗
        </a>
      )}
      <div className="selected-source-text">
        {preview ? (
          <Markdown text={chunk.body} />
        ) : (
          <DiscussionScope
            key={chunk.id}
            studyUnitId={studyUnitId}
            sourceType="chunk"
            sourceId={chunk.id}
          >
            <Markdown text={chunk.body} />
          </DiscussionScope>
        )}
      </div>
      {chunk.criterionCode && (
        <div className="criterion-detail">
          <strong>
            {preview
              ? "Illustrative criterion"
              : chunk.criterionAuthority === "SAQA_VERIFIED"
                ? "SAQA assessment criterion"
                : "Learning criterion · not verified SAQA/CAPS"}{" "}
            · {chunk.criterionCode}
          </strong>
          <p>{chunk.criterionDescription}</p>
          {chunk.criterionSourceUrl?.startsWith("http") && (
            <a href={chunk.criterionSourceUrl} target="_blank" rel="noopener noreferrer">
              View criterion source ↗
            </a>
          )}
        </div>
      )}
    </aside>
  );
}

"use client";
import { useId, useState } from "react";
import { parseLearningBlocks } from "../lib/content/exercises";
import type { Citation } from "../lib/tutor/types";
import { Markdown } from "./markdown";
import { ExerciseScratchpad } from "./math/exercise-scratchpad";
import { parseWidgetBlocks } from "../lib/content/widget-registry";
import { GenericSandboxFrame } from "./generic-sandbox-frame";
import { useModuleCapabilities } from "./module-capabilities";
function Exercise({
  title,
  question,
  answer,
  onAsk,
  citations,
  onCitation,
  highlights,
}: {
  title: string;
  question: string;
  answer: string;
  onAsk?: (title: string, question: string) => void;
  citations?: Citation[];
  onCitation?: (id: string) => void;
  highlights?: string[];
}) {
  const [shown, setShown] = useState(false);
  const capabilities = useModuleCapabilities();
  const id = useId();
  return (
    <section className="try-example">
      <h4>{title}</h4>
      <p className="attempt-note">Try it yourself before revealing the worked answer.</p>
      <Markdown
        approvedLessonFigures
        highlights={highlights}
        text={question}
        citations={citations}
        onCitation={onCitation}
      />
      <div className="exercise-actions">
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={id}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? "Hide answer" : "Show answer"}
        </button>
        {onAsk && (
          <button type="button" onClick={() => onAsk(title, question)}>
            Ask tutor for a hint
          </button>
        )}
      </div>
      {capabilities.math && <ExerciseScratchpad question={question} />}
      {shown && (
        <div id={id} className="worked-answer">
          <Markdown
            approvedLessonFigures
            highlights={highlights}
            text={answer}
            citations={citations}
            onCitation={onCitation}
          />
        </div>
      )}
    </section>
  );
}
export function ExerciseMarkdown({
  text,
  onAsk,
  citations,
  onCitation,
  highlights,
}: {
  text: string;
  onAsk?: (title: string, question: string) => void;
  citations?: Citation[];
  onCitation?: (id: string) => void;
  highlights?: string[];
}) {
  const parsed = parseLearningBlocks(text);
  if (parsed.errors.length)
    return <p role="status">This lesson exercise needs review. Solutions are withheld.</p>;
  return (
    <>
      {parsed.blocks.map((block, i) =>
        block.type === "text" ? (
          <LessonText key={i} text={block.text} {...{ highlights, citations, onCitation }} />
        ) : (
          <Exercise
            key={i}
            {...block}
            highlights={highlights}
            onAsk={onAsk}
            citations={citations}
            onCitation={onCitation}
          />
        ),
      )}
      {parsed.errors.length > 0 && (
        <p role="status">This exercise needs review. Incomplete solutions are withheld.</p>
      )}
    </>
  );
}

function LessonText({
  text,
  highlights,
  citations,
  onCitation,
}: Pick<
  Parameters<typeof ExerciseMarkdown>[0],
  "text" | "highlights" | "citations" | "onCitation"
>) {
  const { blocks, errors } = parseWidgetBlocks(text);
  return (
    <>
      {blocks.map((block, i) =>
        block.type === "widget" ? (
          <GenericSandboxFrame key={i} widget={block.widget} />
        ) : (
          <Markdown
            key={i}
            approvedLessonFigures
            text={block.text}
            {...{ highlights, citations, onCitation }}
          />
        ),
      )}
      {errors.length > 0 && <p role="status">An interactive visual is unavailable.</p>}
    </>
  );
}

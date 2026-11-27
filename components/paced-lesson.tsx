"use client";
import { LessonAttemptProvider, useLessonAttempts } from "./lesson-attempt-store";
import { PracticeSessionContext } from "./written-practice";
import { useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import { lessonSections } from "../lib/content/lesson-sections";
import { readerLessonCopy } from "../lib/content/reader-copy";
import { parseLearningBlocks } from "../lib/content/exercises";
import { ExerciseMarkdown } from "./exercise-markdown";
import { PracticeContext, type PracticeStatus } from "./inline-practice";
type Props = {
  markdown: string;
  highlights?: string[];
  onAsk?: (title: string, question: string) => void;
};
export function PacedLesson(props: Props) {
  const session = useContext(PracticeSessionContext);
  return (
    <LessonAttemptProvider
      key={`${session?.ownerId}:${session?.sessionId}:${session?.version}`}
      session={session}
    >
      <PacedContent {...props} />
    </LessonAttemptProvider>
  );
}
function PacedContent({
  markdown,
  highlights,
  onAsk,
}: {
  markdown: string;
  highlights?: string[];
  onAsk?: (title: string, question: string) => void;
}) {
  const saved = useLessonAttempts();
  const controls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = controls.current;
    const scroll = element?.closest<HTMLElement>(".reader-scroll");
    if (!element || !scroll) return;
    const resize = new ResizeObserver(() =>
      scroll.style.setProperty(
        "--lesson-controls-height",
        `${element.getBoundingClientRect().height + 20}px`,
      ),
    );
    resize.observe(element);
    return () => {
      resize.disconnect();
      scroll.style.removeProperty("--lesson-controls-height");
    };
  }, []);
  const sections = useMemo(() => lessonSections(readerLessonCopy(markdown)), [markdown]);
  const [guided, setGuided] = useState(false),
    [active, setActive] = useState(0),
    [attempts, setAttempts] = useState<Record<string, PracticeStatus>>({});
  const keys = useMemo(
    () =>
      new Set(
        parseLearningBlocks(markdown).blocks.flatMap((b) =>
          b.type === "exercise" ? [`${b.title}\n${b.question}`] : [],
        ),
      ),
    [markdown],
  );
  const report = useCallback(
    (id: string, status: PracticeStatus) => setAttempts((s) => ({ ...s, [id]: status })),
    [],
  );
  const combined = {
    ...attempts,
    ...Object.fromEntries(
      Object.entries(saved?.records ?? {}).map(([key, row]) => [key, row.status]),
    ),
  };
  const tried = Object.keys(combined).filter((k) => keys.has(k)).length,
    checked = Object.entries(combined).filter(([k, s]) => keys.has(k) && s === "checked").length,
    reviewed = Object.entries(combined).filter(([k, s]) => keys.has(k) && s === "reviewed").length;
  useEffect(() => {
    if (guided) return;
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => !!n);
    const root = nodes[0]?.closest<HTMLElement>(".reader-scroll") ?? null;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const line =
          (root?.getBoundingClientRect().top ?? 0) +
          (controls.current?.getBoundingClientRect().height ?? 0) +
          28;
        let next = 0;
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].getBoundingClientRect().top <= line) next = i;
        }
        setActive(next);
      });
    };
    const observer = new IntersectionObserver(update, { root, threshold: [0, 0.1, 1] });
    nodes.forEach((n) => observer.observe(n));
    root?.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      root?.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, [sections, guided]);
  const select = (i: number) => {
    setActive(i);
    requestAnimationFrame(() =>
      document.getElementById(sections[i].id)?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      }),
    );
  };
  return (
    <PracticeContext.Provider value={report}>
      <div className="lesson-pacing" ref={controls}>
        <nav className="lesson-outline" aria-label="Lesson sections">
          {sections
            .map((s, i) => ({ s, i }))
            .filter(
              ({ s, i }) =>
                i === 0 ||
                /intuition|visual|explor|worked example|^procedure$|assessment/i.test(s.title),
            )
            .map(({ s, i }) => (
              <button
                key={s.id}
                type="button"
                aria-current={
                  i ===
                  sections
                    .map((v, j) => ({ v, j }))
                    .filter(
                      ({ v, j }) =>
                        j <= active &&
                        (j === 0 ||
                          /intuition|visual|explor|worked example|^procedure$|assessment/i.test(
                            v.title,
                          )),
                    )
                    .at(-1)?.j
                    ? "step"
                    : undefined
                }
                onClick={() => select(i)}
              >
                {s.title
                  .replace(/^Visual exploration$/i, "Lab")
                  .replace(/^Intuition first$/i, "Intuition")
                  .replace(/^Assessment$/i, "Checks")
                  .replace(/^(?:Original worked example|Procedure)$/i, "Example")}
              </button>
            ))}
        </nav>
        <select
          aria-label="All lesson sections"
          value={active}
          onChange={(e) => select(Number(e.target.value))}
        >
          {sections.map((section, i) => (
            <option key={section.id} value={i}>
              {section.title}
            </option>
          ))}
        </select>
        <button type="button" aria-pressed={guided} onClick={() => setGuided((v) => !v)}>
          Guided mode {guided ? "on" : "off"}
        </button>
        {keys.size > 0 && (
          <div className="lesson-practice-meter">
            <progress aria-label="Practice questions attempted" max={keys.size} value={tried} />
            <small>
              {tried}/{keys.size} tried · {checked} locally checked
              {reviewed > 0 ? ` · ${reviewed} AI reviewed` : ""}. Separate from assessed mastery.
            </small>
          </div>
        )}
      </div>
      {sections.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`lesson-beat lesson-beat-${s.kind}`}
          hidden={guided && i !== active}
        >
          <ExerciseMarkdown text={s.text} highlights={highlights} onAsk={onAsk} />
        </section>
      ))}
      {guided && (
        <nav className="guided-actions" aria-label="Guided lesson steps">
          <button type="button" disabled={active === 0} onClick={() => select(active - 1)}>
            ← Previous beat
          </button>
          <span>
            {active + 1} / {sections.length}
          </span>
          <button
            type="button"
            disabled={active === sections.length - 1}
            onClick={() => select(active + 1)}
          >
            Next beat →
          </button>
        </nav>
      )}
    </PracticeContext.Provider>
  );
}

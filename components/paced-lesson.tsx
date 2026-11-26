"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lessonSections } from "../lib/content/lesson-sections";
import { parseLearningBlocks } from "../lib/content/exercises";
import { ExerciseMarkdown } from "./exercise-markdown";
import { PracticeContext, type PracticeStatus } from "./inline-practice";
export function PacedLesson({
  markdown,
  highlights,
  onAsk,
}: {
  markdown: string;
  highlights?: string[];
  onAsk?: (title: string, question: string) => void;
}) {
  const sections = useMemo(() => lessonSections(markdown), [markdown]);
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
  const tried = Object.keys(attempts).filter((k) => keys.has(k)).length,
    checked = Object.entries(attempts).filter(([k, s]) => keys.has(k) && s === "checked").length;
  useEffect(() => {
    if (guided) return;
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => !!n);
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) {
          const i = sections.findIndex((s) => s.id === hit.target.id);
          if (i >= 0) setActive(i);
        }
      },
      { root: nodes[0]?.closest(".reader-scroll") ?? null, rootMargin: "-10% 0px -60% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
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
      <div className="lesson-pacing">
        <nav className="lesson-outline" aria-label="Lesson sections">
          {sections
            .map((s, i) => ({ s, i }))
            .filter(
              ({ s, i }) =>
                i === 0 || /intuition|visual|explor|worked example|assessment/i.test(s.title),
            )
            .map(({ s, i }) => (
              <button
                key={s.id}
                type="button"
                aria-current={active === i ? "step" : undefined}
                onClick={() => select(i)}
              >
                {s.title
                  .replace(/^Visual exploration$/i, "Lab")
                  .replace(/^Intuition first$/i, "Intuition")
                  .replace(/^Assessment$/i, "Checks")
                  .replace(/^Original worked example$/i, "Example")}
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
              {tried}/{keys.size} tried · {checked} locally checked. Separate from assessed mastery.
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

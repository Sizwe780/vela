"use client";

import { useId, useState } from "react";
import { teachingFrameworks } from "../lib/content/teaching-frameworks";
import styles from "./teaching-framework.module.css";
import { FrameworkDiagram } from "./framework-diagram";
import { VisualCheck } from "./visual-check";

export function TeachingFramework({ framework }: { framework: keyof typeof teachingFrameworks }) {
  const [selected, setSelected] = useState(0);
  const heading = useId();
  const detail = useId();
  const { title, prompt, attribution, source, steps, sequence } = teachingFrameworks[framework];
  const step = steps[selected] ?? steps[0];
  const spectrum = framework === "teaching_philosophy" ? [1, 2, 0] : undefined;

  return (
    <section className={styles.root} aria-labelledby={heading}>
      <h3 id={heading}>{title}</h3>
      <p>{prompt}</p>
      <FrameworkDiagram framework={framework} selected={selected} count={steps.length} />
      {spectrum && (
        <label>
          Teaching approach
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={spectrum.indexOf(selected)}
            aria-valuetext={step.title}
            onChange={(event) => setSelected(spectrum[event.currentTarget.valueAsNumber])}
          />
        </label>
      )}
      <ol
        className={styles.choices}
        aria-label={sequence ? "Reflection stages" : "Framework choices"}
      >
        {steps.map((item, index) => (
          <li key={item.title}>
            <button
              type="button"
              aria-pressed={index === selected}
              aria-controls={detail}
              onClick={() => setSelected(index)}
            >
              {(sequence || framework === "educator_roles") && (
                <span aria-hidden="true">{index + 1}. </span>
              )}
              {item.title}
            </button>
          </li>
        ))}
      </ol>
      <div id={detail} className={styles.detail} aria-live="polite">
        <h4>{step.title}</h4>
        <p>{step.meaning}</p>
        <p>
          <strong>In the classroom</strong> {step.example}
        </p>
      </div>
      {framework === "educator_roles" && (
        <VisualCheck
          check={{
            question:
              "A learner can read the chart but cannot justify a conclusion. Which role gathers evidence of that gap?",
            options: ["Act as assessor", "Act as learning designer"],
            answer: 0,
            feedback:
              "The assessor checks the reasoning against an explicit criterion before deciding on support.",
          }}
        />
      )}
      {framework === "reflection_cycle" && (
        <VisualCheck
          check={{
            question:
              "You want to know whether a quieter reporting routine helps. Which stage sets the next trial and its measure?",
            options: ["Describe the event", "Plan the next action"],
            answer: 1,
            feedback:
              "The action plan specifies the change and the evidence you will collect next.",
          }}
        />
      )}
      <p className={styles.credit}>
        {source ? (
          <a href={source} target="_blank" rel="noreferrer">
            {attribution}
          </a>
        ) : (
          attribution
        )}
      </p>
    </section>
  );
}

"use client";

import { useId, useState } from "react";
import { Markdown } from "./markdown";
import {
  documentSourceUrl,
  type StructuredDocument,
  type VisualBlock,
} from "../lib/content/structured";

export function InteractiveGraph({ block }: { block: VisualBlock }) {
  const [x, setX] = useState(block.initialX);
  const id = useId();
  const limit = block.kind === "limit";
  const integral = block.kind === "integral";
  const f = (value: number) => (limit ? value + 2 : value * value);
  const px = (value: number) => 42 + value * 49;
  const py = (value: number) => 190 - value * 6;
  const curve = Array.from(
    { length: 101 },
    (_, i) => `${i ? "L" : "M"}${px(i / 20)},${py(f(i / 20))}`,
  ).join(" ");
  const area =
    `M${px(0)} ${py(0)} ` +
    Array.from({ length: 61 }, (_, i) => `L${px((x * i) / 60)} ${py(f((x * i) / 60))}`).join(" ") +
    ` L${px(x)} ${py(0)} Z`;
  const tangent = (at: number) => 2 * x * (at - x) + x * x;
  const readout = limit
    ? Math.abs(x - 2) < 0.001
      ? "undefined"
      : (x + 2).toFixed(2)
    : (integral ? x ** 3 / 3 : 2 * x).toFixed(2);
  return (
    <section
      className="tangent-card"
      aria-label={block.title}
      data-testid={`interactive-${block.kind}`}
    >
      <div className="eyebrow">EXPLORE THE MATHEMATICS</div>
      <h3>{block.title}</h3>
      <div className="graph-layout">
        <svg
          viewBox="0 0 320 216"
          role="img"
          aria-label={
            limit
              ? "Removable discontinuity at x equals 2, with limit 4"
              : "Graph of y equals x squared"
          }
          style={{ cursor: "crosshair" }}
          onPointerMove={(event) => {
            const matrix = event.currentTarget.getScreenCTM();
            if (!matrix) return;
            const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
              matrix.inverse(),
            );
            setX(Math.round(Math.max(0, Math.min(5, (point.x - 42) / 49)) * 100) / 100);
          }}
        >
          <rect width="320" height="216" fill="transparent" />
          {[0, 5, 10, 15, 20, 25].map((value) => (
            <g key={value}>
              <path d={`M42 ${py(value)}H292`} stroke="#deded5" strokeDasharray="3 5" />
              <text x="32" y={py(value) + 4} textAnchor="end" fill="#888b80" fontSize="10">
                {value}
              </text>
            </g>
          ))}
          <path d="M42 20V190H300" fill="none" stroke="#a3a69a" />
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <text
              key={value}
              x={px(value)}
              y="207"
              textAnchor="middle"
              fill="#888b80"
              fontSize="10"
            >
              {value}
            </text>
          ))}
          {integral && <path d={area} fill="#b9c9ac" opacity="0.65" />}
          <path d={curve} fill="none" stroke="#536353" strokeWidth="2.5" />
          {!limit && !integral && (
            <path
              d={`M${px(Math.max(0, x - 1))} ${py(tangent(Math.max(0, x - 1)))}L${px(Math.min(5, x + 1))} ${py(tangent(Math.min(5, x + 1)))}`}
              stroke="#a14537"
              strokeWidth="2"
            />
          )}
          {limit && (
            <circle cx={px(2)} cy={py(4)} r="5" fill="white" stroke="#536353" strokeWidth="2" />
          )}
          {(!limit || Math.abs(x - 2) > 0.001) && (
            <circle cx={px(x)} cy={py(f(x))} r="5" fill="#a14537" stroke="white" strokeWidth="2" />
          )}
        </svg>
        <div className="graph-readout">
          <span>{limit ? "FUNCTION VALUE" : integral ? "AREA FROM 0 TO X" : "TANGENT SLOPE"}</span>
          <strong style={readout === "undefined" ? { fontSize: "1rem" } : undefined}>
            <output aria-live="polite">{readout}</output>
          </strong>
          <small>{limit ? "Limit as x → 2 is 4" : integral ? "A(x) = x³/3" : "f′(x) = 2x"}</small>
        </div>
      </div>
      <label className="slider-label" htmlFor={id}>
        <span>Move along the curve</span>
        <strong>x = {x.toFixed(2)}</strong>
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max="5"
        step="0.01"
        value={x}
        onChange={(event) => setX(Number(event.target.value))}
      />
      <p>{block.caption}</p>
      <small>Interactive teaching adaptation; compare with the original source.</small>
    </section>
  );
}

export function StructuredReading({ document }: { document: StructuredDocument }) {
  return (
    <div
      className="structured-reading"
      data-parser={document.parser.name}
      data-review={document.parser.review}
    >
      <aside className="module-info">
        <strong>
          {document.parser.name === "marker" ? "Local Marker OCR" : "Reviewed transcription"} ·{" "}
          {document.parser.review === "machine"
            ? "Machine output — accuracy review pending"
            : "Source visually compared"}
        </strong>
        <p>
          PDF pages {document.source.pageStart}–{document.source.pageEnd}. LaTeX syntax is checked
          before ingestion.
        </p>
        <a href={documentSourceUrl(document)} target="_blank" rel="noopener noreferrer">
          Compare with original PDF ↗
        </a>
      </aside>
      {document.parser.reviewNotes?.map((note) => (
        <p className="document-label" key={note}>
          Source comparison: {note}
        </p>
      ))}
      {document.blocks.map((block) =>
        block.type === "markdown" ? (
          <Markdown key={block.id} text={block.markdown} approvedLessonFigures />
        ) : block.type === "figure" ? (
          <figure className="source-figure" key={block.id}>
            <img src={`/api/figures/${block.asset}`} alt={block.caption} loading="lazy" />
            <figcaption>
              {block.caption} ·{" "}
              {block.vectorAsset && document.parser.review === "source-compared" && (
                <>
                  <a
                    href={`/api/figures/${block.vectorAsset}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Zoom vector figure ↗
                  </a>{" "}
                  ·{" "}
                </>
              )}
              <a
                href={documentSourceUrl(document, block.sourcePage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Original PDF page ↗
              </a>
            </figcaption>
          </figure>
        ) : (
          <div key={block.id}>
            <InteractiveGraph block={block} />
            <a
              href={documentSourceUrl(document, block.sourcePage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Original diagram page {block.sourcePage} ↗
            </a>
          </div>
        ),
      )}
    </div>
  );
}

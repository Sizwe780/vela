"use client";
import { useState, useRef } from "react";
import { Markdown } from "../markdown";
import {
  applyMatrix,
  determinant,
  identity,
  matrixPreview,
  latexNumber,
  inverseMatrix,
  numberLabel,
  realEigensystem,
  type Matrix2,
} from "../../lib/sandboxes/math";
import { useCanvasPlot, line, arrow, clipPlot, type Plot } from "./canvas";
import { usePlayback } from "./playback";
export function MatrixSandbox({ initialMatrix = [1, 2, -1, 1] }: { initialMatrix?: Matrix2 }) {
  const [matrix, setMatrix] = useState<Matrix2>(initialMatrix),
    [t, setT] = useState(1),
    [inverse, setInverse] = useState(false),
    [probe, setProbe] = useState<[number, number]>([1, 1]),
    [showEigen, setShowEigen] = useState(true);
  const geometry = useRef<Plot | null>(null);
  const dragging = useRef<{ column: number; plot: Plot } | null>(null);
  const [dragExtent, setDragExtent] = useState<number | null>(null);
  const inv = inverseMatrix(matrix),
    target = inverse && inv ? inv : matrix,
    preview = matrixPreview(target, t),
    shown = preview.matrix,
    det = determinant(shown),
    eigen = realEigensystem(shown),
    output = applyMatrix(shown, probe);
  const extent =
      dragExtent ??
      Math.max(
        5,
        3 * (Math.abs(target[0]) + Math.abs(target[1])),
        3 * (Math.abs(target[2]) + Math.abs(target[3])),
      ),
    range: [number, number] = [-extent, extent];
  const playback = usePlayback((f) => setT(f), 1800);
  function change(next: Matrix2) {
    playback.stop();
    setMatrix(next);
    setT(1);
    if (!inverseMatrix(next)) setInverse(false);
  }
  const canvas = useCanvasPlot(
    (plot: Plot) => {
      geometry.current = plot;
      const { context: c, x, y, colors } = plot;
      c.font = "11px system-ui";
      c.fillStyle = colors.text;
      c.textAlign = "center";
      for (let n = -3; n <= 3; n++) {
        line(plot, [n, -3], [n, 3], colors.grid);
        line(plot, [-3, n], [3, n], colors.grid);
        if (extent <= 6 || n === -3 || n === 0 || n === 3) c.fillText(String(n), x(n), y(0) + 16);
      }
      clipPlot(plot, () => {
        for (let n = -3; n <= 3; n++) {
          line(plot, applyMatrix(shown, [n, -3]), applyMatrix(shown, [n, 3]), colors.curve);
          line(plot, applyMatrix(shown, [-3, n]), applyMatrix(shown, [3, n]), colors.curve);
        }
        if (!inverse && t === 1)
          for (const point of [
            [shown[0], shown[2]],
            [shown[1], shown[3]],
          ]) {
            c.beginPath();
            c.arc(x(point[0]), y(point[1]), 9, 0, 2 * Math.PI);
            c.fillStyle = colors.secondary;
            c.fill();
            c.strokeStyle = colors.surface;
            c.lineWidth = 2;
            c.stroke();
          }
        line(plot, [-extent, 0], [extent, 0], colors.axis);
        line(plot, [0, -extent], [0, extent], colors.axis);
        c.setLineDash([4, 4]);
        line(plot, [1, 0], [1, 1], colors.secondary);
        line(plot, [1, 1], [0, 1], colors.secondary);
        line(plot, [0, 1], [0, 0], colors.secondary);
        line(plot, [0, 0], [1, 0], colors.secondary);
        c.setLineDash([]);
        const square = (
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ] as [number, number][]
        ).map((p) => applyMatrix(shown, p));
        c.beginPath();
        square.forEach(([a, b], i) => {
          if (!i) c.moveTo(x(a), y(b));
          else c.lineTo(x(a), y(b));
        });
        c.closePath();
        c.globalAlpha = 0.24;
        c.fillStyle = colors.curve;
        c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = colors.curve;
        c.lineWidth = 3;
        c.stroke();
        if (showEigen && eigen.kind === "real") {
          c.setLineDash([7, 5]);
          for (const pair of eigen.pairs)
            line(
              plot,
              [-pair.vector[0] * extent * 2, -pair.vector[1] * extent * 2],
              [pair.vector[0] * extent * 2, pair.vector[1] * extent * 2],
              colors.secondary,
              2,
            );
          c.setLineDash([]);
        }
        arrow(plot, applyMatrix(shown, [1, 0]), colors.curve);
        arrow(plot, applyMatrix(shown, [0, 1]), colors.secondary);
        c.setLineDash([3, 3]);
        line(plot, [0, 0], probe, colors.axis, 2);
        c.setLineDash([]);
        arrow(plot, output, colors.text);
      });
    },
    range,
    range,
    true,
  );
  const presets: { label: string; matrix: Matrix2 }[] = [
    { label: "Identity", matrix: identity },
    { label: "Shear", matrix: [1, 1, 0, 1] },
    { label: "Quarter turn", matrix: [0, -1, 1, 0] },
    { label: "Reflection", matrix: [-1, 0, 0, 1] },
    { label: "Collapse to a line", matrix: [1, 2, 0.5, 1] },
    { label: "Zero matrix", matrix: [0, 0, 0, 0] },
  ];
  return (
    <figure className="concept-sandbox" aria-label="Matrix transformation sandbox">
      <figcaption>
        <span className="sandbox-eyebrow">Linear algebra · explore first</span>
        <h3>A matrix moves an entire plane</h3>
        <p>
          Predict what happens to the square, then change one entry. The coloured columns show where
          the basis vectors go.
        </p>
      </figcaption>
      <div className="sandbox-presets">
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => change(p.matrix)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="matrix-controls">
        {matrix.map((value, i) => (
          <label key={i}>
            Entry {"abcd"[i]} · {numberLabel(value)}
            <input
              aria-label={`Matrix entry ${"abcd"[i]}`}
              type="range"
              min="-3"
              max="3"
              step="any"
              value={value}
              onChange={(e) =>
                change(matrix.map((v, j) => (i === j ? Number(e.target.value) : v)) as Matrix2)
              }
            />
          </label>
        ))}
      </div>
      <Markdown
        text={`$A=\\begin{bmatrix}${latexNumber(matrix[0])}&${latexNumber(matrix[1])}\\\\${latexNumber(matrix[2])}&${latexNumber(matrix[3])}\\end{bmatrix}$`}
      />
      <canvas
        ref={canvas}
        style={{ touchAction: "none", cursor: inverse || t !== 1 ? "default" : "grab" }}
        onPointerDown={(e) => {
          const p = geometry.current;
          if (!p || inverse || t !== 1) return;
          const box = e.currentTarget.getBoundingClientRect(),
            x = ((e.clientX - box.left) * p.width) / box.width,
            y = ((e.clientY - box.top) * p.height) / box.height;
          const distances = [
            Math.hypot(x - p.x(matrix[0]), y - p.y(matrix[2])),
            Math.hypot(x - p.x(matrix[1]), y - p.y(matrix[3])),
          ];
          const column = distances[0] <= distances[1] ? 0 : 1;
          if (distances[column] > 24) return;
          dragging.current = { column, plot: p };
          setDragExtent(extent);
          e.currentTarget.setPointerCapture(e.pointerId);
          playback.stop();
        }}
        onPointerMove={(e) => {
          const drag = dragging.current;
          if (!drag) return;
          const p = drag.plot,
            box = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - box.left) * p.width) / box.width,
            y = ((e.clientY - box.top) * p.height) / box.height;
          const bounded = (n: number) => Math.round(Math.max(-3, Math.min(3, n)) * 10) / 10;
          const copy = [...matrix] as Matrix2;
          copy[drag.column] = bounded((x - p.x(0)) / (p.x(1) - p.x(0)));
          copy[drag.column + 2] = bounded((y - p.y(0)) / (p.y(1) - p.y(0)));
          change(copy);
        }}
        onPointerUp={() => {
          dragging.current = null;
          setDragExtent(null);
        }}
        onPointerCancel={() => {
          dragging.current = null;
          setDragExtent(null);
        }}
        className="sandbox-canvas"
        role="img"
        aria-label="Original and transformed coordinate grids with a unit square"
      >
        The square's transformed area is {numberLabel(Math.abs(det))}. Use the entry controls and
        textual readouts.
      </canvas>
      <p className="learning-caption">
        Drag either filled basis-vector handle to change a matrix column. The entry controls provide
        a keyboard alternative. Dragging is available in the full forward transformation view.
      </p>
      <div className="sandbox-readouts">
        <output aria-live={playback.playing ? "off" : "polite"}>
          Signed determinant: <strong>{numberLabel(det)}</strong> · area scaling:{" "}
          <strong>{numberLabel(Math.abs(det))}</strong>
        </output>
        <p>
          {det === 0
            ? shown.every((v) => v === 0)
              ? "The whole plane collapses to the origin."
              : "The square collapses to a line: two-dimensional area is zero."
            : det < 0
              ? "Orientation is reversed."
              : "Orientation is preserved."}
        </p>
      </div>
      <label>
        Transformation progress · {Math.round(t * 100)}%
        <input
          aria-label="Transformation progress"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={t}
          onChange={(e) => {
            playback.stop();
            setT(Number(e.target.value));
          }}
        />
      </label>
      <div className="sandbox-actions">
        <button
          type="button"
          disabled={playback.reduced}
          onClick={() => {
            if (playback.playing) playback.stop();
            else {
              setT(0);
              playback.start();
            }
          }}
        >
          {playback.playing ? "Pause transformation" : "Animate transformation"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={inverse && !!inv}
            disabled={!inv}
            onChange={(e) => {
              playback.stop();
              setInverse(e.target.checked);
              setT(1);
            }}
          />
          Apply inverse of A
        </label>
        <label>
          <input
            type="checkbox"
            checked={showEigen}
            onChange={(e) => setShowEigen(e.target.checked)}
          />
          Show real eigendirections
        </label>
      </div>
      <p className="sandbox-note">
        {preview.path === "rotation"
          ? "A rotation path preserves area throughout the preview."
          : `Preview matrix B(t) = (1 − t)I + t${inverse ? "A⁻¹" : "A"}. This interpolation is not generally a rigid rotation.`}{" "}
        Readouts describe the current preview matrix.{" "}
        {playback.reduced
          ? "Animation is disabled for reduced motion; the slider still works."
          : ""}
        {!inv
          ? determinant(matrix) === 0
            ? " A is singular and has no inverse."
            : " The inverse is not shown near numerical singularity."
          : ""}
      </p>
      <div className="sandbox-eigen" aria-label="Eigenvector interpretation">
        {eigen.kind === "all" ? (
          <p>
            Every nonzero direction is an eigenvector direction, with λ = {numberLabel(eigen.value)}
            .{eigen.value === 0 ? " All vectors map to zero." : ""}
          </p>
        ) : eigen.kind === "complex" ? (
          <p>No real eigendirections: this matrix has a complex conjugate pair of eigenvalues.</p>
        ) : eigen.kind === "unstable" ? (
          <p>
            The discriminant is numerically close to zero. Use exact algebra to classify the
            eigenvalues.
          </p>
        ) : (
          eigen.pairs.map((p, i) => (
            <div key={i}>
              <p>
                λ ≈ {numberLabel(p.value)}; direction ≈ ({numberLabel(p.vector[0])},{" "}
                {numberLabel(p.vector[1])}).{" "}
                {p.value === 0
                  ? "This eigendirection collapses to the origin."
                  : p.value < 0
                    ? "Vectors reverse along the same line."
                    : "Vectors stay along the same line."}
              </p>
              <button type="button" onClick={() => setProbe([p.vector[0], p.vector[1]])}>
                Trace direction {i + 1}
              </button>
            </div>
          ))
        )}
      </div>
      <details>
        <summary>Test your own vector</summary>
        {probe.map((value, i) => (
          <label key={i}>
            Input {i === 0 ? "x" : "y"}: {numberLabel(value)}
            <input
              aria-label={`Probe ${i === 0 ? "x" : "y"}`}
              type="range"
              min="-2"
              max="2"
              step="any"
              value={value}
              onChange={(e) =>
                setProbe(
                  probe.map((v, j) => (i === j ? Number(e.target.value) : v)) as [number, number],
                )
              }
            />
          </label>
        ))}
        <p>
          Transformed vector: ({numberLabel(output[0])}, {numberLabel(output[1])}). Eigenvectors
          stay on their span; they need not keep their length or orientation.
        </p>
      </details>
      <p className="sandbox-note">
        This editable model is independent exploration. It does not change the lesson's givens or
        award mastery. Numerical pictures support reasoning; they do not replace a proof.
      </p>
    </figure>
  );
}

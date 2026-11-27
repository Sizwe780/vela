import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { curriculum } from "../content/mat1503/sessions";
import { loadModuleSpec, auditUnit } from "../lib/specs";
import { parseLearningBlocks } from "../lib/content/exercises";
import { mathSpans, normalizeMath } from "../lib/content/math";
import { visualPresetIds } from "../lib/content/visual-presets";
import { LinearSessionVisual } from "../components/linear-session-visual";
import {
  transformVector,
  replaceSecondRow,
  determinantModel,
  combineVectors,
  nonzeroComplexRoots,
} from "../lib/content/linear-models";
import { structuredDocumentSchema } from "../lib/content/structured";
test("all13MAT1503units satisfy the stricter core and mathematical/PCK profile", async () => {
  const spec = await loadModuleSpec({ institution: "UNISA", moduleCode: "MAT1503" });
  assert.equal(curriculum.length, 13);
  let gates = 0;
  for (const [i, unit] of curriculum.entries()) {
    assert.equal(unit.code, `MAT1503-U${i + 1}`);
    assert.equal(unit.sessions.length, 6);
    const audit = auditUnit(spec, unit, { allowedVisuals: visualPresetIds });
    assert.ok(audit.passed, JSON.stringify(audit.issues));
    for (const s of unit.sessions) {
      const parsed = parseLearningBlocks(s.markdown);
      assert.equal(parsed.errors.length, 0);
      gates += parsed.blocks.filter((b) => b.type === "exercise").length;
      assert.ok(mathSpans(normalizeMath(s.markdown)).length);
    }
  }
  assert.equal(gates, 468);
});
test("linear models preserve inverse/row-operation/root identities and all render safely", () => {
  const v = transformVector(2, -1);
  const back = transformVector(v[0], v[1], true);
  assert.deepEqual(back, [2, -1]);
  for (const k of [-3, 0, 3]) {
    const m = replaceSecondRow(k);
    assert.equal(m[0][0] * m[1][1] - m[0][1] * m[1][0], -5);
  }
  assert.equal(determinantModel(4), 0);
  assert.deepEqual(combineVectors(2, -1), [5, 0]);
  for (const [x, y] of nonzeroComplexRoots(8, 0, 3)) {
    const real = x * x * x - 3 * x * y * y,
      imag = 3 * x * x * y - y * y * y;
    assert.ok(Math.abs(real - 8) < 1e-8 && Math.abs(imag) < 1e-8);
  }
  assert.throws(() => nonzeroComplexRoots(0, 0, 3));
  for (const kind of [
    "linear-system",
    "matrix-transform",
    "row-operation",
    "determinant-area",
    "vector-combination",
    "vector-projection",
    "complex-plane",
  ]) {
    const html = renderToStaticMarkup(createElement(LinearSessionVisual, { kind }));
    assert.ok(!html.includes("katex-error"), kind);
    assert.ok(!html.includes("NaN"), kind);
    if (kind === "row-operation") {
      assert.ok(html.includes("M310 48V208"));
      assert.ok(html.includes("Augmented matrix: row one"));
    }
  }
});
test("structured source IDs support module registries and reject traversal", () => {
  const doc = {
    version: 1,
    parser: { name: "marker", version: "2.1.0", review: "machine" },
    source: { document: "mat1503-textbook", sha256: "a".repeat(64), pageStart: 16, pageEnd: 16 },
    blocks: [{ id: "p", type: "markdown", markdown: "A source equation $x+y=5$." }],
  };
  assert.ok(structuredDocumentSchema.safeParse(doc).success);
  assert.equal(
    structuredDocumentSchema.safeParse({ ...doc, source: { ...doc.source, document: "../.env" } })
      .success,
    false,
  );
});

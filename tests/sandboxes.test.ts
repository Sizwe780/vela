import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMatrix,
  determinant,
  inverseMatrix,
  matrixPreview,
  realEigensystem,
  riemannSum,
  geometricArea,
  numberLabel,
  type Matrix2,
} from "../lib/sandboxes/math";
import { companionCards, widgetSchema } from "../lib/tutor/cards";
const close = (a: number, b: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
test("matrix models preserve area, orientation and exact inverse behavior", () => {
  const a: Matrix2 = [1, 2, -1, 1];
  close(determinant(a), 3);
  assert.deepEqual(applyMatrix(a, [1, 1]), [3, 0]);
  const inverse = inverseMatrix(a)!;
  const roundTrip = applyMatrix(inverse, applyMatrix(a, [2, -1]));
  close(roundTrip[0], 2);
  close(roundTrip[1], -1);
  assert.equal(inverseMatrix([1, 2, 0.5, 1]), null);
  assert.equal(determinant([-1, 0, 0, 1]), -1);
  assert.equal(numberLabel(1e-14), "1e-14");
});
test("eigenvector models distinguish rotation, scalar maps and defective repeated eigenvalues", () => {
  assert.equal(realEigensystem([0, -1, 1, 0]).kind, "complex");
  assert.deepEqual(realEigensystem([0, 0, 0, 0]), { kind: "all", value: 0 });
  const jordan = realEigensystem([1, 1, 0, 1]);
  assert.equal(jordan.kind, "real");
  if (jordan.kind === "real") {
    assert.equal(jordan.pairs.length, 1);
    close(jordan.pairs[0].vector[1], 0);
  }
  for (const a of [
    [1, 2, 0.5, 1],
    [2, 1, 1, 2],
    [-1, 0, 0, 1],
  ] as Matrix2[]) {
    const eigen = realEigensystem(a);
    assert.equal(eigen.kind, "real");
    if (eigen.kind === "real")
      for (const { value, vector } of eigen.pairs) {
        const out = applyMatrix(a, vector);
        close(out[0], value * vector[0]);
        close(out[1], value * vector[1]);
      }
  }
});
test("rotation animation preserves area throughout rather than shrinking the square", () => {
  for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
    const shown = matrixPreview([0, -1, 1, 0], t);
    assert.equal(shown.path, "rotation");
    close(determinant(shown.matrix), 1);
    close(Math.hypot(...applyMatrix(shown.matrix, [1, 0])), 1);
  }
  assert.deepEqual(matrixPreview([0, -1, 1, 0], 1).matrix, [0, -1, 1, 0]);
  assert.equal(matrixPreview([1, 2, -1, 1], 0.5).path, "linear");
});
test("Riemann sums agree with independent linear and quadratic formulas", () => {
  for (const n of [1, 2, 8, 64, 512]) {
    close(riemannSum([0, 3, 2], 0, 4, n, "right").sum, 32 + 24 / n);
    close(riemannSum([0, 3, 2], 0, 4, n, "midpoint").sum, 32);
    close(riemannSum([1, 0, 0], 0, 2, n, "right").sum, 8 / 3 + 4 / n + 4 / (3 * n * n));
  }
  close(riemannSum([1, 0, 0], 0, 2, 4, "midpoint").sum, 2.625);
  assert.ok(Math.abs(riemannSum([1, 0, 0], 0, 2, 512, "midpoint").sum - 8 / 3) < 0.00001);
});
test("true rectangle bounds include turning points and signed area is not geometric area", () => {
  for (const n of [1, 3, 32, 512]) {
    const value = riemannSum([1, 0, -1], -2, 2, n, "midpoint");
    assert.ok(value.lower <= value.exact + 1e-10);
    assert.ok(value.upper >= value.exact - 1e-10);
  }
  close(riemannSum([0, 1, -1], 0, 2, 8, "midpoint").sum, 0);
  close(geometricArea([0, 1, -1], 0, 2), 1);
  close(geometricArea([0, 0, -2], 0, 3), 6);
  assert.throws(() => riemannSum([1, 0, 0], 0, Infinity, 8, "right"));
  assert.throws(() => riemannSum([1, 0, 0], 0, 1, 0, "right"));
});
test("new visual frames enforce typed mathematical data and reject executable functions", () => {
  for (const frame of [
    { type: "matrix", data: { matrix: [1, 1, 0, 1] } },
    { type: "riemann", data: { coefficients: [1, 0, 0], bounds: [0, 2] } },
    { type: "limitzoom", data: { coefficients: [0, 1, 13], center: 13 } },
  ])
    assert.equal(widgetSchema.safeParse(frame).success, true);
  assert.equal(
    widgetSchema.safeParse({ type: "matrix", data: { matrix: [1, 2, 3] } }).success,
    false,
  );
  assert.equal(
    widgetSchema.safeParse({ type: "riemann", data: { coefficients: [1, 0, 0], bounds: [2, 0] } })
      .success,
    false,
  );
  assert.equal(
    widgetSchema.safeParse({ type: "riemann", data: { function: "eval(x)", bounds: [0, 1] } })
      .success,
    false,
  );
  const parsed = companionCards('<render_widget type="matrix" data=\'{"matrix":[1,1,0,1]}\' />');
  assert.equal(parsed.widgets[0]?.type, "matrix");
  const mixed = companionCards(
    `<widget type="matrix" data='{"matrix":[1,0,0,1]}' />\n\`\`\`widget\n{"type":"riemann","data":{"coefficients":[1,0,0],"bounds":[0,2]}}\n\`\`\`\n<widget type="limitzoom" data='{"coefficients":[0,1,0],"center":1}' />`,
  );
  assert.deepEqual(
    mixed.widgets.map((w) => w.type),
    ["matrix", "riemann", "limitzoom"],
  );
});

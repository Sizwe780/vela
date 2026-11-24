import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moduleCapabilities,
  combineCapabilities,
  permitsWidget,
  universalCapabilities,
} from "../lib/capabilities";
test("module tools follow explicit institution profiles, without prefix or universal-maths assumptions", () => {
  const linear = moduleCapabilities("UNISA", "MAT1503"),
    calc = moduleCapabilities("UNISA", "MAT1512"),
    education = moduleCapabilities("UNISA", "BPT1501");
  assert.equal(linear.matrix, true);
  assert.equal(linear.calculus, false);
  assert.equal(calc.matrix, false);
  assert.equal(calc.calculus, true);
  assert.equal(education.math, false);
  assert.equal(education.pck, true);
  assert.equal(permitsWidget(education, "matrix"), false);
  assert.equal(permitsWidget(calc, "matrix"), false);
  assert.equal(permitsWidget(linear, "riemann"), false);
  assert.deepEqual(moduleCapabilities("Other institution", "MAT1512"), universalCapabilities);
  assert.deepEqual(moduleCapabilities("UNISA", "MAT9999"), universalCapabilities);
  assert.deepEqual(combineCapabilities([]), universalCapabilities);
  assert.equal(combineCapabilities([linear, calc]).matrix, true);
  assert.equal(combineCapabilities([education]).math, false);
});

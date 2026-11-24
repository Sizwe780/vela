import assert from "node:assert/strict";
import { test } from "node:test";
import { physicsPilot, physicsNext, physicsFurther, physicsFinal, physicsDepth, physicsEnrichment, physicsApplications, physicsConsolidation, physicsCompletion } from "../content/physics/pilot";
import { moduleCapabilities } from "../lib/capabilities";
import { parseLearningBlocks } from "../lib/content/exercises";
import { parseWidgetBlocks, widgetCapability } from "../lib/content/widget-registry";
import { lessonDraftSchema } from "../lib/generation/draft";
import {
  circularTrial,
  axialExtension,
  bridgeSignal,
  dcCellTrial,
  electronOrbit,
  electronRingDiameter,
  gratingOrderAngle,
  inclineTrial,
  gliderCollision,
  instrumentReading,
  linearFit,
  pendulumTrial,
  parallelWireForce,
  photoelectricTrial,
  projectileTrial,
  rotationalInertia,
  standardGravity,
  straightLineMotion,
  venturiTrial,
} from "../lib/sandboxes/physics";
import { auditUnit, loadModuleSpec } from "../lib/specs";

test("physics pilot units pass the core and physics audits with inline, capability-gated widgets", async () => {
  for (const unit of [...physicsPilot, ...physicsNext, ...physicsFurther, ...physicsFinal, ...physicsDepth, ...physicsEnrichment, ...physicsApplications, ...physicsConsolidation, ...physicsCompletion]) {
    const moduleCode = unit.code.split("-")[0];
    const draft = lessonDraftSchema.parse({ code: unit.code, sessions: unit.sessions });
    const report = auditUnit(await loadModuleSpec({ institution: "UNISA", moduleCode }), draft);
    assert.equal(report.passed, true, JSON.stringify(report.issues));
    for (const session of draft.sessions) {
      const lesson = parseLearningBlocks(session.markdown);
      assert.equal(lesson.blocks.filter((block) => block.type === "exercise").length, 6);
      const visual = parseWidgetBlocks(session.markdown);
      assert.deepEqual(visual.errors, []);
      const block = visual.blocks.find((block) => block.type === "widget");
      assert.ok(block && block.widget.type === "physics_workshop");
      assert.equal(moduleCapabilities("UNISA", moduleCode)[widgetCapability(block.widget)], true);
      assert.equal(moduleCapabilities("UNISA", "CHE1501")[widgetCapability(block.widget)], false);
    }
  }
});

test("regression handles degeneracy and recovers gravity from small-angle pendulum data", () => {
  const readings = [0.3, 0.6, 0.9, 1.2].map((x) => ({
    x, y: pendulumTrial(x).squaredPeriod, dx: 0.01, dy: 0.05,
  }));
  const fit = linearFit(readings);
  assert.ok(fit);
  assert.ok(Math.abs(4 * Math.PI ** 2 / fit.slope - standardGravity) < 1e-10);
  assert.ok(Math.abs(fit.intercept) < 1e-10);
  assert.ok(fit.slopeError < 1e-10);
  assert.equal(fit.rSquared, 1);
  assert.equal(linearFit(readings.slice(0, 2)), null);
  assert.equal(linearFit(readings.map((p) => ({ ...p, x: 1 }))), null);
  assert.equal(linearFit(readings.map((p) => ({ ...p, y: 1 })))?.rSquared, null);
});

test("virtual apparatus preserves signed zero correction and conservation laws", () => {
  const reading = instrumentReading(5.5, 23, 0.01, -0.03);
  assert.equal(reading.corrected.toFixed(2), "5.76");
  assert.equal(circularTrial(0.2, 0.3, 6).force / circularTrial(0.2, 0.3, 3).force, 4);
  assert.deepEqual(straightLineMotion(6, -3, 4), { position: 0, velocity: -6, acceleration: -3 });
  for (const elastic of [true, false]) {
    const result = gliderCollision(0.2, 0.3, 0.7, elastic);
    assert.ok(Math.abs(result.momentum - (0.2 * result.velocityA + 0.3 * result.velocityB)) < 1e-12);
    assert.ok(elastic ? Math.abs(result.beforeEnergy - result.afterEnergy) < 1e-12 : result.beforeEnergy > result.afterEnergy);
  }
});

test("terminal voltage falls with current and its regression recovers the internal resistance", () => {
  const points = [3, 6, 12, 20].map((resistance) => {
    const reading = dcCellTrial(6, 2, resistance);
    assert.ok(Math.abs(reading.terminalVoltage + reading.internalDrop - 6) < 1e-12);
    return { x: reading.current, y: reading.terminalVoltage, dx: 0, dy: 0 };
  });
  const fit = linearFit(points);
  assert.ok(fit);
  assert.ok(Math.abs(fit.intercept - 6) < 1e-12);
  assert.ok(Math.abs(fit.slope + 2) < 1e-12);
});

test("mechanics sandboxes preserve the component model, static limit and geometric scalings", () => {
  const shallow = projectileTrial(12, 30, 0);
  const steep = projectileTrial(12, 60, 0);
  assert.ok(Math.abs(shallow.range - steep.range) < 1e-10);
  assert.ok(Math.abs(shallow.heightAt(shallow.flightTime)) < 1e-10);
  assert.equal(inclineTrial(2, 20, 0.40, 0.32).acceleration, 0);
  assert.ok(inclineTrial(2, 45, 0.40, 0.32).acceleration > 0);
  assert.equal(rotationalInertia("ring", 2, 0.5), 2 * rotationalInertia("disk", 2, 0.5));
  assert.deepEqual(venturiTrial(4, 2, 1), { throatSpeed: 4, drop: 7500 });
  assert.ok(Math.abs(axialExtension(120, 2, 4e-6, 100e9) - 0.0006) < 1e-12);
});

test("virtual practicals enforce nulls, thresholds and wave scalings", () => {
  assert.equal(bridgeSignal(50, 12, 12), 0);
  assert.equal(parallelWireForce(6, 0.004, 0.25), 4 * parallelWireForce(3, 0.004, 0.25));
  assert.equal(gratingOrderAngle(600, 700, 3), null);
  assert.ok(Math.abs(gratingOrderAngle(600, 500, 1)! - 17.46) < 0.01);
  assert.equal(photoelectricTrial(577, 2.5).stoppingVoltage, null);
  assert.ok(photoelectricTrial(365, 2.5).stoppingVoltage! > 0);
  assert.equal(electronOrbit(180, 1), 2 * electronOrbit(180, 2));
  assert.equal(electronRingDiameter(2000, 0.135, 0.213e-9), 2 * electronRingDiameter(8000, 0.135, 0.213e-9));
});

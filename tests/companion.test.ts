import { test } from "node:test";
import assert from "node:assert/strict";
import { companionCards } from "../lib/tutor/cards";
test("companion sections and bounded widget frames preserve math", () => {
  const result = companionCards(
    '## Core Answer\n$x^2$\n## Step-by-Step Derivation\nDifferentiate.\n<render_widget type="derivative" data=\'{"label":"Slope"}\' />',
  );
  assert.equal(result.cards.length, 2);
  assert.ok(result.cards[0].text.includes("$x^2$"));
  assert.equal(result.widgets[0].type, "derivative");
});
test("executable, unknown and partial widget payloads never render", () => {
  for (const frame of [
    '<render_widget type="graph" data=\'{"expression":"alert(1)"}\' />',
    "<render_widget type=\"iframe\" data='{}' />",
    '<render_widget type="graph"',
  ])
    assert.equal(companionCards(frame).widgets.length, 0);
});

test("custom widget tags and JSON frames accept bounded parameters only", () => {
  const parsed = companionCards(`<widget type="secant" data='{ "coefficients":[2,-1,3] }' />`);
  assert.equal(parsed.widgets[0].type, "secant");
  if (parsed.widgets[0].type === "secant")
    assert.deepEqual(parsed.widgets[0].data.coefficients, [2, -1, 3]);
  assert.equal(
    companionCards('```widget\n{"type":"vector","data":{}}\n```').widgets[0].type,
    "vector",
  );
  for (const text of [
    '```widget\n{"type":"vector","data":{}}',
    `<widget type="graph" data='{"coefficients":[999,0,0]}' />`,
    `<widget type="graph" data='{"coefficients":[1,0,0],"expression":"fetch()"}' />`,
  ])
    assert.equal(companionCards(text).widgets.length, 0);
  assert.equal(
    companionCards(Array(9).fill(`<widget type="vector" data='{}' />`).join(" ")).widgets.length,
    3,
  );
});

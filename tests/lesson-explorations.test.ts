import assert from "node:assert/strict";
import { test } from "node:test";
import { chemistryBatches } from "../content/che1501/batches";
import { curriculum } from "../content/mat1503/sessions";
import { curriculum as calculus } from "../content/mat1512/sessions";
import { bpt1501Batches } from "../content/bpt1501/batches";
import { inlineSessionVisual } from "../lib/content/inline-visual";
import { calculusCurve } from "../lib/content/calculus-models";
import {
  gasVolume,
  equilibriumModel,
  equilibriumQuotientAfter,
} from "../lib/sandboxes/chemistry-models";
import { lessonFigure, lessonFigures } from "../lib/content/lesson-figures";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExerciseMarkdown } from "../components/exercise-markdown";
import { moduleCapabilities } from "../lib/capabilities";
import { chemistryExplorations } from "../lib/content/chemistry-explorations";
import { linearExplorations } from "../lib/content/linear-explorations";
import { parseLearningBlocks } from "../lib/content/exercises";
import {
  parseWidgetBlocks,
  readWidgetDirective,
  widgetCapability,
} from "../lib/content/widget-registry";

test("all four authored curricula expose a registered inline visual in each session", () => {
  for (const [module, units] of [
    ["MAT1503", curriculum],
    ["CHE1501", chemistryBatches.map(({ unit }) => unit)],
    ["MAT1512", calculus],
    ["BPT1501", bpt1501Batches.map(({ unit }) => unit)],
  ] as const) {
    const capabilities = moduleCapabilities("UNISA", module);
    for (const unit of units) {
      for (const session of unit.sessions) {
        const lesson = parseLearningBlocks(inlineSessionVisual(session.markdown, session.visual));
        assert.deepEqual(lesson.errors, [], session.title);
        const widgets = lesson.blocks.flatMap((block) => {
          if (block.type !== "text") return [];
          const parsed = parseWidgetBlocks(block.text);
          assert.deepEqual(parsed.errors, [], session.title);
          return parsed.blocks.filter((item) => item.type === "widget").map(({ widget }) => widget);
        });
        assert.ok(widgets.length, `${unit.code}: ${session.title} needs a visual`);
        for (const widget of widgets) assert.ok(capabilities[widgetCapability(widget)]);
        if (
          widgets.some(
            ({ type }) =>
              type.endsWith("_exploration") ||
              type === "orbital_overlap" ||
              type === "matrix_transform" ||
              type === "linear_model",
          )
        ) {
          assert.match(
            session.markdown,
            /(?:^|\n)## Visual exploration\b(?:(?!\n## )[\s\S])*?\n:::widget/,
          );
        }
      }
    }
  }
});

test("a stored preset is inserted before exercises and existing directives take precedence", () => {
  const lesson =
    "## Concept\nRead this idea.\n\n## Assessment\n:::exercise Try it\nWhy?\n:::answer\nBecause.\n:::end";
  const inline = inlineSessionVisual(lesson, "equilibrium-lab");
  assert.ok(inline.indexOf(':::widget{type="lesson_preset"') < inline.indexOf("## Assessment"));
  assert.match(inline, /:::answer\nBecause\.\n:::end/);
  assert.equal(inlineSessionVisual(inline, "equilibrium-lab"), inline);
  assert.equal(
    widgetCapability(
      readWidgetDirective(':::widget{type="lesson_preset" model="equilibrium-lab"}'),
    ),
    "reactions",
  );
});

test("an unsupported visual leaves surrounding teaching, registered photographs and answer gates intact", () => {
  const lesson = `## Why this works
The crystal shows repeating structure.

![Halite](/lesson-figures/halite.webp)

:::widget{type="unavailable_model"}
:::

The formula records the ion ratio.

:::exercise Read the model
What does the formula count?
:::answer
This answer only appears after a reveal.
:::end`;
  const html = renderToStaticMarkup(createElement(ExerciseMarkdown, { text: lesson }));
  assert.match(html, /The crystal shows repeating structure/);
  assert.match(html, /<img[^>]+src="\/lesson-figures\/halite.webp"/);
  assert.match(html, /The formula records the ion ratio/);
  assert.match(html, /An interactive visual is unavailable/);
  assert.match(html, /Show answer/);
  assert.doesNotMatch(html, /This answer only appears after a reveal/);
});

test("sourced figures have verifiable provenance and photographs have local responsive variants", () => {
  assert.equal(new Set(lessonFigures.map((figure) => figure.src)).size, lessonFigures.length);
  for (const figure of lessonFigures) {
    const content = readFileSync(resolve("public", figure.src.slice(1)));
    if (figure.src.endsWith(".webp")) {
      assert.ok(figure.sourceUrl);
      assert.ok(figure.variants && figure.variants.length >= 2);
      for (const variant of figure.variants)
        assert.ok(readFileSync(resolve("public", variant.src.slice(1))).length > 0);
    }
    if (figure.sourceUrl) {
      assert.match(figure.sourceUrl, /^https:\/\//);
      assert.match(
        figure.license?.url ?? "",
        /^https:\/\/(?:creativecommons\.org\/|www\.dvidshub\.net\/about\/copyright$)/,
      );
      assert.match(figure.retrievedOn ?? "", /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(createHash("sha256").update(content).digest("hex"), figure.digest);
      if (figure.license?.url === "https://www.dvidshub.net/about/copyright")
        assert.match(figure.notice ?? "", /endorsement/);
    }
  }
  assert.equal(lessonFigure("/lesson-figures/unknown.webp"), undefined);
  assert.equal(lessonFigure("https://example.invalid/lesson-figures/classroom.webp"), undefined);
});

test("calculus and chemistry model readouts preserve the highlighted relationships", () => {
  assert.equal(calculusCurve("fundamental").slope?.(1.5), 3);
  assert.equal(calculusCurve("substitution").at(2), 5);
  assert.ok(Number.isNaN(calculusCurve("corner").slope?.(0)));
  assert.equal(calculusCurve("asymptote").intervals.length, 2);
  assert.equal(gasVolume(2, 300), gasVolume(1, 300) / 2);
  assert.ok(Math.abs(gasVolume(1, 300, 1.5) - gasVolume(1, 300) * 1.5) < 1e-10);
  assert.equal(equilibriumModel(2, 1).direction, "reverse");
  assert.ok(equilibriumQuotientAfter(6, 2, 1) < 6);
  assert.ok(equilibriumQuotientAfter(0.5, 2, 1) > 0.5);
  assert.equal(equilibriumModel(1, 0.5).forward, equilibriumModel(1, 0.5).reverse);
});

test("exploration cases use complete rows, valid plot indices and one consistent comparison scale", () => {
  for (const model of Object.values({ ...linearExplorations, ...chemistryExplorations })) {
    assert.ok(model.stages.length >= 2, model.title);
    for (const stage of model.stages) {
      assert.ok(
        stage.rows.every((row) => row.length === model.columns.length),
        model.title,
      );
      assert.equal(
        new Set(stage.rows.map(([label]) => label)).size,
        stage.rows.length,
        model.title,
      );
      if (stage.focus !== undefined)
        assert.ok(stage.focus >= 0 && stage.focus < stage.rows.length, model.title);
      if (stage.plot) {
        const { points, segments } = stage.plot;
        assert.ok(
          points.every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y)),
          model.title,
        );
        assert.ok(
          segments.flat().every((index) => !!points[index]),
          model.title,
        );
      }
      if (model.comparison) {
        const { column, max } = model.comparison;
        assert.ok(
          stage.rows.every((row) => Number(row[column]) >= 0 && Number(row[column]) <= max),
          model.title,
        );
      }
    }
  }
  assert.throws(() => readWidgetDirective(':::widget{type="linear_exploration" model="unknown"}'));
  assert.throws(() => readWidgetDirective(':::widget{type="matrix_transform" a=4 b=0 c=0 d=1}'));
});

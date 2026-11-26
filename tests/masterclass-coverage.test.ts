import { lessonFigure } from "../lib/content/lesson-figures";
import { test } from "node:test";
import assert from "node:assert/strict";
import { curriculum } from "../content/mat1512/sessions";
import { normalizeMath, mathSpans } from "../lib/content/math";
import { loadModuleSpec, auditUnit } from "../lib/specs/index";
import { visualPresetIds } from "../lib/content/visual-presets";
import { parseLearningBlocks } from "../lib/content/exercises";

test("MAT1512 masterclasses cover all layers and cognitive verification levels", async () => {
  assert.deepEqual(
    curriculum.map((unit) => unit.code),
    ["MAT1512-U1", "MAT1512-U2", "MAT1512-U3", "MAT1512-U4", "MAT1512-U5"],
  );
  const spec = await loadModuleSpec({ institution: "UNISA", moduleCode: "MAT1512" });
  const headings = [
    "Intuition first",
    "Visual exploration",
    "Procedure",
    "Interpretation",
    "Common mistakes",
    "Assessment",
    "Application(?: and PCK)?",
    "Pause and Predict",
  ];
  for (const unit of curriculum) {
    assert.ok(unit.sessions.length >= 6, `${unit.code}: needs a multi-session masterclass`);
    assert.equal(
      new Set(unit.sessions.map((session) => session.title)).size,
      unit.sessions.length,
      `${unit.code}: duplicate session titles`,
    );
    const report = auditUnit(spec, unit, { allowedVisuals: visualPresetIds });
    assert.ok(report.passed, JSON.stringify(report.issues));
    for (const session of unit.sessions) {
      for (const heading of headings)
        assert.ok(
          new RegExp(`^## ${heading}\\s*$`, "mi").test(session.markdown),
          `${unit.code} / ${session.title}: missing ${heading}`,
        );
      const assessment =
        session.markdown.match(/^## Assessment\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/im)?.[1] ?? "";
      const parsedAssessment = parseLearningBlocks(assessment);
      assert.deepEqual(
        parsedAssessment.errors,
        [],
        `${session.title}: malformed question-first assessment`,
      );
      const exercises = parsedAssessment.blocks.filter((block) => block.type === "exercise");
      for (const level of ["Recognition", "Procedure", "Error correction", "Transfer"]) {
        const exercise = exercises.find((block) =>
          block.title.trim().toLowerCase().startsWith(level.toLowerCase()),
        );
        assert.ok(exercise, `${session.title}: missing ${level} exercise`);
        assert.ok(
          exercise.question.trim().length >= 8,
          `${session.title}: ${level} requires a substantive question`,
        );
        const explanation = exercise.answer.replace(/\*\*Worked solution:\*\*/gi, "").trim();
        assert.ok(
          explanation.length >= 8,
          `${session.title}: ${level} requires explanatory feedback inside its answer block`,
        );
      }
      assert.ok(
        mathSpans(normalizeMath(session.markdown)).length,
        `${session.title}: no checked mathematical content`,
      );
      assert.doesNotMatch(session.markdown, /diagram placeholder|insert (?:figure|diagram) here/i);
      for (const image of session.markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        assert.ok(
          lessonFigure(image[1]),
          `${session.title}: unregistered lesson figure ${image[1]}`,
        );
      }
    }
  }
});

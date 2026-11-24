import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleStudyText, searchStudyDocuments } from "../lib/search/visible";
import { profileInput, positionInput, bookmarkInput } from "../lib/student/input";
test("search indexes teaching and questions while hiding every worked solution", () => {
  const markdown =
    "Visible intuition about limits.\n:::exercise Try a limit\nPredict the nearby value.\n:::answer\nSECRET_WORKED_ANSWER_49\n:::end\nVisible interpretation.";
  const visible = visibleStudyText(markdown);
  assert.ok(visible.includes("Predict the nearby value"));
  assert.ok(!visible.includes("SECRET_WORKED_ANSWER"));
  const docs = [
    {
      id: "s",
      title: "Limits",
      unitId: "u",
      unitTitle: "Continuity",
      moduleCode: "MAT1512",
      visible,
    },
  ];
  assert.equal(searchStudyDocuments(docs, "limits").length, 1);
  assert.equal(searchStudyDocuments(docs, "SECRET_WORKED_ANSWER").length, 0);
  assert.equal(visibleStudyText(":::exercise Try\nQuestion\n:::answerbad\nPRIVATE\n:::end"), "");
});
test("student preferences cannot appoint staff or change identity", () => {
  const valid = { displayName: "Test Learner", weeklyGoalMinutes: 120, emailReminders: false };
  assert.ok(profileInput.safeParse(valid).success);
  for (const fields of [
    { role: "admin" },
    { studentId: "another-user" },
    { staffMemberships: [{ role: "admin" }] },
  ])
    assert.equal(profileInput.safeParse({ ...valid, ...fields }).success, false);
  assert.equal(profileInput.safeParse({ ...valid, weeklyGoalMinutes: 0 }).success, false);
});
test("saved-source and resume requests reject identity overrides and oversized excerpts", () => {
  assert.ok(
    bookmarkInput.safeParse({
      studyUnitId: "u",
      sourceType: "session",
      sourceId: "s",
      quote: "My selected passage",
    }).success,
  );
  assert.equal(
    bookmarkInput.safeParse({
      studyUnitId: "u",
      sourceType: "session",
      sourceId: "s",
      quote: "x".repeat(2001),
    }).success,
    false,
  );
  assert.equal(positionInput.safeParse({ sessionId: "s", studentId: "victim" }).success, false);
  assert.equal(
    bookmarkInput.safeParse({
      studyUnitId: "u",
      sourceType: "session",
      sourceId: "s",
      role: "admin",
    }).success,
    false,
  );
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../components/markdown";
test("saved selections become semantic marks without evaluating selection text", () => {
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      text: "Understand the nearby values before a formal limit.",
      highlights: ["nearby values"],
    }),
  );
  assert.ok(html.includes('<mark class="saved-highlight">nearby values</mark>'));
  const safe = renderToStaticMarkup(
    createElement(Markdown, { text: "Study safely.", highlights: ["<script>alert(1)</script>"] }),
  );
  assert.ok(!safe.includes("<script>"));
});

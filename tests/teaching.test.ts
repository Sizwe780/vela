import assert from "node:assert/strict";
import { test } from "node:test";
import { commandSchema, learnerCommandSchema, rubricPoints } from "../lib/teaching/input";

test("learner classroom commands take identity and grades from the server", () => {
  const submission = { action: "submit", assignmentId: "a1", body: "My work" };
  assert.ok(learnerCommandSchema.safeParse(submission).success);
  assert.equal(learnerCommandSchema.safeParse({ ...submission, studentId: "s1" }).success, false);
  assert.equal(learnerCommandSchema.safeParse({ ...submission, scores: [20] }).success, false);
  assert.equal(
    learnerCommandSchema.safeParse({ action: "claim", token: "x".repeat(64) }).success,
    false,
  );
});

test("rubrics require distinct criteria and an in-range score for every criterion", () => {
  const rubric = [
    { label: "Reasoning", max: 4 },
    { label: "Application", max: 6 },
  ];
  assert.deepEqual(rubricPoints(rubric, [3, 4]), { points: 7, total: 10 });
  assert.equal(rubricPoints(rubric, [3, 7]), null);
  assert.equal(rubricPoints(rubric, [3]), null);
  assert.equal(rubricPoints(rubric, [2.5, 5]), null);
  const assignment = {
    action: "createAssignment",
    qualificationId: "q1",
    moduleId: "m1",
    title: "Assignment",
    instructions: "Justify each claim.",
    dueAt: "2027-04-01T09:00:00.000Z",
  };
  assert.ok(commandSchema.safeParse({ ...assignment, rubric }).success);
  assert.equal(
    commandSchema.safeParse({
      ...assignment,
      rubric: [rubric[0], { label: " reasoning ", max: 5 }],
    }).success,
    false,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { outcomeEvidence, studyRecommendations, type OutcomeInput } from "../lib/insights/evidence";
const base: OutcomeInput = {
  id: "a",
  title: "Explain the concept",
  unitId: "u",
  unitTitle: "Unit",
  moduleId: "m",
  moduleCode: "CODE",
  due: null,
  mixedScore: 1,
  attempts: 9,
  studyLink: "/study/u",
  nextSession: "/study/u/sessions/s",
};
test("outcome evidence separates mixed recall from quiz and AI conceptual estimates", () => {
  const events = [
    { id: "q1", outcomeId: "a", kind: "quiz" as const, score: 0.25, at: "2026-11-01T00:00:00Z" },
    { id: "q2", outcomeId: "a", kind: "quiz" as const, score: 0.75, at: "2026-11-02T00:00:00Z" },
    { id: "c", outcomeId: "a", kind: "concept" as const, score: 0.4, at: "2026-11-03T00:00:00Z" },
    {
      id: "other",
      outcomeId: "other",
      kind: "quiz" as const,
      score: 1,
      at: "2026-11-04T00:00:00Z",
    },
  ];
  const summary = outcomeEvidence(base, events);
  assert.equal(summary.mixedScore, 1);
  assert.equal(summary.quiz?.score, 0.75);
  assert.equal(summary.concept?.score, 0.4);
  assert.equal(summary.quizChange, 50);
  assert.equal(summary.quizAttempts, 2);
  assert.deepEqual(
    summary.quizHistory.map((q) => q.id),
    ["q1", "q2"],
  );
  const fresh = outcomeEvidence(base, []);
  assert.equal(fresh.quiz, null);
  assert.equal(fresh.quizChange, null);
  assert.equal(fresh.quizAttempts, 0);
  assert.equal(outcomeEvidence(base, [{ ...events[0], score: NaN }]).quiz, null);
});
test("recommendations prioritize actual due reviews, distinguish missing evidence and cover modules", () => {
  const now = new Date("2026-11-18T00:00:00Z");
  const a = outcomeEvidence({ ...base, due: "2026-11-17T00:00:00Z" }, []);
  const sameUnit = outcomeEvidence({ ...base, id: "b", due: "2026-11-17T00:00:00Z" }, []);
  const different = outcomeEvidence(
    { ...base, id: "c", unitId: "v", moduleId: "n", moduleCode: "OTHER", nextSession: null },
    [],
  );
  const tasks = studyRecommendations([a, sameUnit, different], now);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].kind, "review");
  assert.equal(tasks[1].kind, "check");
  assert.ok(tasks[0].href.includes("unit=u"));
  assert.ok(!tasks[1].reason.includes("weak"));
  const future = outcomeEvidence({ ...base, due: "2026-12-01T00:00:00Z" }, []);
  assert.equal(studyRecommendations([future], now)[0].kind, "read");
});

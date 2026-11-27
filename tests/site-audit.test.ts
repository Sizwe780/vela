import test from "node:test";
import assert from "node:assert/strict";
import { nextStudyMidnight, studyDay } from "../lib/activity/time";
import { bankQuiz, generateUnitQuiz, quizBanks } from "../lib/quiz/bank";
import { mathSpans } from "../lib/content/math";
import { quizReference } from "../lib/quiz/reference";
import { dedupeLessonHeadings } from "../lib/content/lesson-sections";
const sources = [
  {
    id: "source",
    learningOutcomeId: "outcome",
    title: "Published reading",
    body: "Linear systems have consistent or inconsistent solution sets.",
  },
];
test("review day boundaries use SAST including late UTC evenings", () => {
  const now = new Date("2026-11-26T22:30:00Z");
  assert.equal(studyDay(now), "2026-11-27");
  assert.equal(nextStudyMidnight(now).toISOString(), "2026-11-27T22:00:00.000Z");
  assert.ok(new Date("2026-11-27T20:00:00Z") < nextStudyMidnight(now));
  assert.ok(!(new Date("2026-11-27T22:00:00Z") < nextStudyMidnight(now)));
});
test("fixed unit banks have complete maths, distinct choices and valid keys", () => {
  assert.equal(Object.keys(quizBanks).length, 48);
  for (const [code, questions] of Object.entries(quizBanks)) {
    assert.equal(questions.length, 2);
    for (const q of questions)
      for (const text of [q.prompt, q.explanation, ...(q.options ?? [])])
        assert.doesNotThrow(() => mathSpans(text), code);
    const issued = bankQuiz(code, sources);
    assert.ok(issued.every((q) => q.sourceChunkId === "source"));
    assert.ok(
      issued.every(
        (q) => q.options?.some((o) => o.id === q.answer.optionId) || q.answer.accepted?.length,
      ),
    );
  }
});
test("default generation makes no AI request and provider fallback uses a fixed bank", async () => {
  let calls = 0;
  const ai = async () => {
    calls++;
    return { provider: "heuristic", questions: [], notice: "Provider unavailable" };
  };
  const local = await generateUnitQuiz("MAT1503-U1", sources, "auto", undefined, ai);
  assert.equal(local.provider, "bank");
  assert.equal(calls, 0);
  const fallback = await generateUnitQuiz("MAT1503-U1", sources, "cloudflare", undefined, ai);
  assert.equal(fallback.provider, "bank");
  assert.equal(calls, 1);
  assert.equal(fallback.questions.length, 2);
  assert.throws(() => bankQuiz("UNKNOWN-U1", sources), /awaiting editorial/);
  assert.throws(() => bankQuiz("MAT1503-U1", sources, "OTHER"), /awaiting editorial/);
});
test("reading links remain current-unit local links", () => {
  assert.equal(
    quizReference("/study/unit#session-unit-S1", "unit", "chunk"),
    "/study/unit/sessions/unit-S1",
  );
  for (const raw of [
    "https://evil.example/",
    "/study/another/sessions/s1",
    "/study/unit/sessions/../../profile",
  ])
    assert.equal(quizReference(raw, "unit", "chunk"), "/study/unit#chunk-chunk");
});
test("adjacent repeated headings are removed without editing formulas, code or exercises", () => {
  const text =
    "## Recognition\n\n### Recognition\nA question.\n\n```md\n## Repeat\n### Repeat\n```\n:::exercise Example\n## Keep\n### Keep\n:::answer\n$x^2$\n:::end";
  const result = dedupeLessonHeadings(text);
  assert.ok(!result.includes("### Recognition"));
  assert.ok(result.includes("## Repeat\n### Repeat"));
  assert.ok(result.includes("## Keep\n### Keep"));
  assert.ok(result.includes("$x^2$"));
});

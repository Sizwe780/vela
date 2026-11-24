import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTutorInput } from "../lib/tutor/input";
import { scaffoldInstructions } from "../lib/tutor/scaffolding";
import { buildTutorPrompt } from "../lib/tutor/prompt";
import { moduleCapabilities, universalCapabilities } from "../lib/capabilities";
const base = { query: "Why does this argument hold?", studyUnitId: "unit1", mode: "academic" };
test("hint requests have distinct bounded instructions and cannot combine with debate", () => {
  assert.equal(parseTutorInput(base).strategy, "coach");
  assert.equal(scaffoldInstructions({ strategy: "coach" }), "");
  for (const hintTier of [1, 2, 3]) {
    const input = parseTutorInput({ ...base, hintTier });
    const prompt = scaffoldInstructions(input);
    assert.match(prompt, new RegExp(`ACTIVE REQUEST: Hint Tier ${hintTier}`));
    assert.match(prompt, /do not answer or finish the learner's actual task/i);
  }
  assert.match(
    scaffoldInstructions({ strategy: "coach", hintTier: 3 }),
    /Gate its worked solution/,
  );
  for (const extra of [
    { hintTier: 0 },
    { hintTier: 4 },
    { hintTier: 1.5 },
    { hintTier: "1" },
    { hintTier: 1, strategy: "debate" },
    { strategy: "adversary" },
    { capabilities: { debate: true } },
  ])
    assert.throws(() => parseTutorInput({ ...base, ...extra }));
  assert.match(
    scaffoldInstructions(parseTutorInput({ ...base, strategy: "debate" })),
    /ONE hypothetical counter-position/,
  );
});
test("conceptual module policies omit specialized mathematical widget prompts", () => {
  const conceptual = moduleCapabilities("UNISA", "BPT1501");
  assert.equal(conceptual.debate, true);
  const prompt = buildTutorPrompt("academic", [], "unit", conceptual);
  assert.match(prompt, /No mathematical widgets/);
  assert.doesNotMatch(prompt, /<render_widget/);
  const calc = buildTutorPrompt("academic", [], "unit", moduleCapabilities("UNISA", "MAT1512"));
  assert.match(calc, /type="riemann"/);
  assert.doesNotMatch(calc, /type="matrix"/);
});
test("trusted versioned module metadata overrides profiles and malformed flags fail closed", () => {
  const conceptual = moduleCapabilities("Institution", "EDU1", {
    runtimeCapabilities: { version: 1, tools: ["pck", "debate"] },
  });
  assert.equal(conceptual.debate, true);
  assert.equal(conceptual.math, false);
  for (const runtimeCapabilities of [
    { version: 2, tools: ["debate"] },
    { version: 1, tools: ["matrix"] },
    { version: 1, tools: ["debate", "debate"] },
    { version: 1, tools: ["arbitrary"] },
  ])
    assert.deepEqual(
      moduleCapabilities("UNISA", "MAT1512", { runtimeCapabilities }),
      universalCapabilities,
    );
});

import { guidedReply, sameGuidedResult } from "../lib/tutor/guided";
test("deep transfer retries multiple questions and offers only a mapped refresher after repeated attempts", async () => {
  const history = [
    { role: "user", content: "Check density" },
    { role: "assistant", content: "How do you convert the volume?" },
    { role: "user", content: "Multiply by 10" },
    { role: "assistant", content: "How many millilitres are in a litre?" },
  ];
  let attempts = 0;
  let link = "";
  const response = await guidedReply(
    parseTutorInput({ ...base, pace: "transfer", history }),
    "policy",
    {
      prerequisites: [{ id: "science.volume-conversion", title: "Convert volume units" }],
      onPrerequisite: (id) => {
        link = id;
      },
      generate: async () => ({
        feedback: "Use the volume conversion first.",
        question:
          ++attempts === 1
            ? "Which unit comes first? Why?"
            : "How many cubic centimetres make one litre?",
        prerequisite: "science.volume-conversion",
      }),
    },
  );
  assert.equal(attempts, 2);
  assert.equal((response.match(/\?/g) ?? []).length, 1);
  assert.equal(link, "science.volume-conversion");
});

test("deep transfer can salvage one validated question from a second cloud draft", async () => {
  const turn = parseTutorInput({ ...base, pace: "transfer", provider: "cloudflare" });
  let calls = 0;
  const answer = await guidedReply(turn, "Current lesson", {
    generate: async (schema) => {
      calls++;
      return schema.parse({
        feedback: "",
        question: "How many electrons does one permanganate ion gain? What happens to sulfite?",
      });
    },
  });
  assert.equal(calls, 2);
  assert.match(answer, /How many electrons does one permanganate ion gain\?$/);
  assert.doesNotMatch(answer, /What happens to sulfite/);
});
test("checked parallel hints retry equal results and keep internal task results out of the response", async () => {
  const input = parseTutorInput({ ...base, hintTier: 3 });
  let calls = 0;
  const text = await guidedReply(input, "trusted policy", {
    generate: async () => ({
      actualResult: "7",
      parallelResult: ++calls === 1 ? "14/2" : "5",
      title: "New example",
      problem: "Solve $3y+2=17$.",
      solution: calls === 1 ? "$y=7$" : "Subtract two, then divide by three: $y=5$.",
      question: "How can you transfer the principle?",
    }),
  });
  assert.equal(calls, 2);
  assert.match(text, /:::answer/);
  assert.match(text, /y=5/);
  assert.doesNotMatch(text, /actualResult|14\/2|y=7/);
  assert.equal(sameGuidedResult("7", "\\frac{21}{3}"), true);
  assert.equal(sameGuidedResult("7", "5"), false);
});
test("unchecked or invalid guided responses fail visibly after two attempts without an answer fallback", async () => {
  let calls = 0;
  await assert.rejects(
    guidedReply(parseTutorInput({ ...base, hintTier: 3 }), "policy", {
      generate: async () => {
        calls++;
        return {
          actualResult: "7",
          parallelResult: "7",
          title: "Example",
          problem: "Try it",
          solution: "$x=7$",
          question: "What changes?",
        };
      },
    }),
    (error: unknown) => error instanceof Error && error.message.includes("did not pass"),
  );
  assert.equal(calls, 2);
  const reply = await guidedReply(parseTutorInput({ ...base, strategy: "debate" }), "policy", {
    generate: async () => ({
      challenge: "A single rule could affect learners differently.",
      question: "What evidence would distinguish those effects?",
    }),
  });
  assert.match(reply, /Hypothetical challenge:/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

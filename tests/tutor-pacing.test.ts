import test from "node:test";
import assert from "node:assert/strict";
import { tutorPacingInstructions, needsGuidedReply } from "../lib/tutor/pacing";
import { parseTutorInput } from "../lib/tutor/input";
import { guidedReply } from "../lib/tutor/guided";
const base = {
  studyUnitId: "synthetic-unit",
  mode: "academic",
  query: "Explain this step",
  provider: "cloudflare",
};
test("Normal and Deep transfer choose distinct execution paths; explicit hints and debate take precedence", () => {
  const normal = parseTutorInput({
    ...base,
    pace: "normal",
    history: [{ role: "assistant", content: "Earlier we used Deep transfer." }],
  });
  assert.equal(needsGuidedReply(normal), false);
  assert.equal(needsGuidedReply(parseTutorInput({ ...base, pace: "transfer" })), true);
  assert.equal(needsGuidedReply(parseTutorInput({ ...base, pace: "normal", hintTier: 1 })), true);
  assert.equal(
    needsGuidedReply(parseTutorInput({ ...base, pace: "normal", strategy: "debate" })),
    true,
  );
  assert.match(tutorPacingInstructions(normal.pace), /answer.*directly/i);
  assert.match(tutorPacingInstructions(normal.pace), /even if history used Deep transfer/);
  assert.match(tutorPacingInstructions("transfer"), /exactly ONE focused question/);
});
test("Deep transfer carries the current pacing policy and retries multi-question drafts", async () => {
  let calls = 0;
  const result = await guidedReply(
    parseTutorInput({ ...base, pace: "transfer" }),
    "Synthetic concept evidence",
    {
      generate: async (_schema, messages) => {
        assert.match(String(messages[0].content), /CURRENT RESPONSE PACE: DEEP TRANSFER/);
        assert.match(String(messages[0].content), /WAIT/);
        return {
          feedback: "",
          question: ++calls === 1 ? "What changes? Why?" : "Which property stays unchanged?",
        };
      },
    },
  );
  assert.equal(calls, 2);
  assert.equal((result.match(/\?/g) ?? []).length, 1);
  assert.doesNotMatch(result, /What changes/);
});

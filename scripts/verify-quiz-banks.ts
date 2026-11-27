import { quizBanks, quizBankHash } from "../lib/quiz/bank";
import { mathSpans } from "../lib/content/math";
let count = 0;
for (const [code, questions] of Object.entries(quizBanks)) {
  for (const question of questions) {
    for (const text of [question.prompt, question.explanation, ...(question.options ?? [])]) {
      // Shared math preflight is also used by lesson publication.
      try {
        mathSpans(text);
      } catch (error) {
        throw Error(`${code}: ${error instanceof Error ? error.message : "Invalid mathematics"}`);
      }
    }
    count++;
  }
}
console.log(
  `Validated ${count} fixed questions across ${Object.keys(quizBanks).length} unit banks. Bank SHA-256: ${quizBankHash}`,
);

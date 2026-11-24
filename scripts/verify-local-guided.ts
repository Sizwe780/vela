import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { guidedReply } from "../lib/tutor/guided";
import { parseTutorInput } from "../lib/tutor/input";
async function main() {
  for (const mode of [1, 2, 3, "debate"] as const) {
    const start = Date.now();
    try {
      const query =
        mode === "debate"
          ? "Every learner benefits from identical feedback because fairness means sameness."
          : "I need to solve 2x + 5 = 19. Give the requested hint without the answer.";
      const result = await guidedReply(
        parseTutorInput({
          studyUnitId: "diagnostic-only",
          mode: "academic",
          provider: "ollama",
          query,
          ...(mode === "debate" ? { strategy: "debate" } : { hintTier: mode }),
        }),
        "",
        {
          signal: AbortSignal.timeout(150000),
          localEvidence:
            mode === "debate"
              ? "Current session: Feedback and evidence. Effective feedback identifies a specific next learning action. Learners' needs and context can differ; scores alone do not describe their next step."
              : "Current session: Linear equations. Equality remains true when the same reversible operation is applied to both sides. A linear equation involves constants times unknowns to the first power.",
        },
      );
      await writeFile(`../work/ollama-direct-${mode}.md`, result);
      console.log(JSON.stringify({ mode, formatPassed: true, milliseconds: Date.now() - start }));
    } catch (e) {
      process.exitCode = 1;
      console.log(
        JSON.stringify({
          mode,
          formatPassed: false,
          error: e instanceof Error ? e.message : "Failure",
          milliseconds: Date.now() - start,
        }),
      );
    }
  }
}
main().catch(() => {
  process.exitCode = 1;
});

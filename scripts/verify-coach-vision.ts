import "dotenv/config";
import { readFile } from "node:fs/promises";
import { coachJSON } from "../lib/coach/ai";
import { transcriptionSchema } from "../lib/coach/types";
async function main() {
  const image =
    "data:image/png;base64," +
    (await readFile("tests/fixtures/handwriting-font-working.png")).toString("base64");
  const result = await coachJSON(
    transcriptionSchema,
    [
      {
        role: "system",
        content:
          'Transcribe the visible mathematics exactly as written. Do not correct the intentional sign error. Return strict JSON {"steps":[{"number":1,"latex":"...","description":"","uncertain":false}],"notice":"..."}. Only two mathematical steps are present. Preserve all minus signs; use escaped LaTeX.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this synthetic handwriting-font test image." },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
    { vision: true },
  );
  console.log(
    JSON.stringify({
      test: "Cloudflare live vision on synthetic handwriting-font fixture, not real handwriting",
      result,
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Vision test failed");
  process.exitCode = 1;
});

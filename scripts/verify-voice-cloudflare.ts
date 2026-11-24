import "dotenv/config";
import { readFile } from "node:fs/promises";
import { configuredAI } from "../lib/ai/config";
import { providerCredential } from "../lib/ai/credentials";
async function main() {
  const config = configuredAI("cloudflare");
  const token = await providerCredential(config);
  const audio = (await readFile("tests/fixtures/synthetic-math-question.wav")).toString("base64");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ audio }),
      signal: AbortSignal.timeout(60000),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.result?.text)
    throw Error("Cloudflare synthetic-audio transcription failed: HTTP " + response.status);
  console.log(
    JSON.stringify({
      test: "Cloudflare Whisper with generated speech, no microphone recording",
      transcript: data.result.text,
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Voice test failed");
  process.exitCode = 1;
});

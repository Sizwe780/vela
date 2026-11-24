import { requireUnitAccess } from "../../../../lib/enrollment/access";
import { requireLearner } from "../../../../lib/auth/server";
import { assertTutorOrigin } from "../../../../lib/tutor/origin";
import { providerCredential } from "../../../../lib/ai/credentials";
import { configuredAI } from "../../../../lib/ai/config";
import { IngestError, publicError } from "../../../../lib/ingest/errors";
import { limitCoach } from "../../../../lib/coach/context";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    assertTutorOrigin(request);
    const learner = await requireLearner();
    const unitId = new URL(request.url).searchParams.get("studyUnitId");
    await requireUnitAccess(learner.id, unitId ?? "");
    limitCoach(learner.id);
    if (!/^audio\/(webm|ogg|mp4|wav)/.test(request.headers.get("content-type") ?? ""))
      throw new IngestError(415, "AUDIO_FORMAT", "Unsupported recording format.");
    const reader = request.body?.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    if (!reader) throw new IngestError(400, "EMPTY_AUDIO", "No recording received.");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4_000_000) {
        await reader.cancel();
        throw new IngestError(413, "AUDIO_TOO_LARGE", "Keep recordings under 4 MB.");
      }
      parts.push(value);
    }
    if (!size) throw new IngestError(400, "EMPTY_AUDIO", "No recording received.");
    const config = configuredAI("cloudflare");
    const token = await providerCredential(config);
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ audio: Buffer.concat(parts).toString("base64") }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
      },
    );
    const data = await response.json();
    if (!response.ok || !data.result?.text)
      throw new IngestError(
        503,
        "VOICE_UNAVAILABLE",
        "Transcription is unavailable. Use text or try again.",
      );
    return Response.json(
      { transcript: String(data.result.text).slice(0, 4000) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const f = publicError(
      e instanceof IngestError
        ? e
        : new IngestError(503, "VOICE_UNAVAILABLE", "Voice is unavailable. Use text instead."),
    );
    return Response.json({ error: f.error }, { status: f.status });
  }
}

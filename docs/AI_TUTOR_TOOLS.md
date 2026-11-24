# AI learning tools

Open an enrolled unit and session, switch to the learning companion, and choose **Tutor tools**. These tools use the active server-loaded session; no module code is embedded in generic components.

## Snap & Diagnose

1. Photograph/upload a JPEG, PNG or WebP (up to 20 MB before preparation).
2. Move the four crop boundaries to exclude names/student numbers. **Prepare crop** redraws the selected area on a canvas, removes original file metadata and limits the longest edge to 1,600 pixels. A prepared crop must fit the 1.3 MB server limit.
3. Explicitly allow sending that crop to Cloudflare and choose **Transcribe this crop**. Vela keeps the photo out of its database and application logs.
4. Inspect and edit the numbered expressions and written reasoning. Unclear OCR is flagged. **Type steps instead** is available without OCR.
5. Confirm the transcription before **Confirm and diagnose**. The tutor highlights numbered steps, identifies a likely error and asks a repair question. This is provisional AI feedback; it does not award mastery.

The optional local algebra check uses the bounded worker from [MATH_PRACTICE.md](MATH_PRACTICE.md), with no inference call. It checks adjacent expressions in x, or antiderivatives relative to step 1. It does not verify general equations, written proofs or undeclared row operations. Keep all domain conditions; an unverified result is not a wrong answer.

`POST /api/tutor/photo` accepts `{ studyUnitId, sessionId, image }` with a validated raster data URL. `POST /api/tutor/diagnose` accepts `{ studyUnitId, sessionId, question, confirmed: true, steps: [{ number, latex, description }] }`. Both require the signed-in student's enrollment and exact session membership. Image text and confirmed steps are untrusted data, never prompt instructions. Images are not accepted by URL, so the API cannot fetch arbitrary student-supplied network locations.

## Teach the tutor

Choose **Teach the tutor → Start teaching this session**. Explain the core idea for a novice, why it works, an original example and a condition/limitation. The four published rubric facets are accuracy, reasoning, clarity and example/conditions; fluency cannot compensate for a false central explanation.

`POST /api/tutor/teach` issues an owner-bound, one-hour attempt for the current session version and content hash. Submission supplies only `{ action: "submit", attemptId, explanation }`; scores, identities and outcome mappings are never trusted from the browser. Positive rubric scores require real quotations from both the learner and the current lesson. Missing evidence, uncertainty or session changes prevent credit. A second review challenges proposed misconceptions and incomplete evidence; the server's evidence rules remain unchanged.

These checks support **AI-assisted practice estimates**, not formal correctness certification. A quoted passage is not proof that a model's interpretation is right. Read feedback critically and seek a human explanation when it seems inconsistent.

Submission is claimed before inference; the model call holds no database transaction. Saving rechecks enrollment, serializes the attempt and outcome points, and writes `StudentMastery` and the result transactionally. A replay returns the saved result without another model call or mastery increment. Concurrent retries cannot grade twice. Points reward improvement of the learner's personal best, capped at 10 per outcome. Reading/session completion and institutional marks are separate. Drafts remain in the open tool on errors; submitted explanations and feedback are stored in `ConceptAttempt` for the learner's progress/audit.

`GET /api/tutor/teach` returns the current learner's conceptual-points summary. The dashboard and existing progress listeners refresh after an assessed submission. No client CAS or OCR response can award conceptual points. The issuance limit is 12 attempts per learner per hour; an additional in-process coach limiter protects inference requests. Multi-instance production deployments need a shared rate-limit store in addition to provider allowance limits.

## Voice at your pace

The companion header's **Voice options** keeps all settings in a compact drawer. Microphone capture is off until explicitly started. Choose:

- **Dictate a question** for browser recognition with interim text and a reviewed transcript before sending.
- **Start voice conversation** for opt-in hands-free turns: a final recognized utterance is sent, complete response sentences are spoken as text arrives, then recognition resumes after playback and generation finish.
- **Record with Cloudflare · 30s** when browser recognition is unavailable. It records a bounded clip, transcribes it and lets you review before sending.
- **Read responses aloud** to use the browser/device's speech synthesis. Common mathematical symbols are verbalized; matrices/code/widgets refer back to the screen rather than being read as raw markup.

Browser dictation can use the browser vendor's remote speech service. Do not describe it as guaranteed on-device processing. Supported languages/voices and latency depend on the browser, operating system and network. The default recognition language is English (South Africa); playback prefers an available English South Africa voice. This is turn-based browser speech, not full-duplex OpenAI Realtime or ElevenLabs.

**Stop voice** remains available in the header when active. Hiding the page, changing session/mode/provider, resetting the conversation or leaving stops capture/playback. A cancelled pending microphone permission grant cannot leave a late stream recording. Headphones may help; speech recognition does not run while response audio is playing. Use HTTPS for remote/mobile hosting; localhost is suitable for local testing.

`POST /api/tutor/voice?studyUnitId=...` remains the authenticated, enrollment-gated Cloudflare recording fallback, with a 4 MB cap. Voice consent is explicit; transcripts enter the existing active-session tutor flow.

## Free development configuration

Existing Cloudflare/Wrangler credentials are reused on the server. The default coach model is `@cf/mistralai/mistral-small-3.1-24b-instruct`, configurable with `CLOUDFLARE_COACH_MODEL`. Both photo transcription and conceptual/working reviews use the Workers AI allowance. An exhausted allowance returns a retry message; there is no automatic paid-provider fallback. Browser speech does not require an OpenAI or ElevenLabs key. Cloudflare's own free allowance/model availability still applies; do not promise unlimited inference.

Streaming Cloudflare chat now defaults to the same Mistral model (`CLOUDFLARE_CHAT_MODEL` overrides it). Live matrix checks exposed misleading determinant-step labels and missing widget frames from the previous 3B default. The stronger default uses more of the Workers AI allowance; finite graphs remain entirely local and free of inference calls. Model outputs still require mathematical review.

Primary integration references: [Cloudflare model documentation](https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/), [Web Speech API behavior and privacy](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API).

## Validation and limits

- `npm test` covers evidence matching, unsupported/fabricated grades, core-error caps, image/type/numbering boundaries and streamed speech segmentation.
- `scripts/verify-coach.ts` uses isolated learner fixtures and a deterministic grader to exercise PostgreSQL replay/concurrency, points caps, enrollment withdrawal, ownership and source-version checks. It never edits published lessons or real student records.
- Live Cloudflare tests use an explicitly synthetic handwriting-font image, a synthetic learner explanation and generated speech. They do not demonstrate every student's handwriting, accent or real microphone hardware.
- Browser tests cover cropping/confirmation/diagnosis, real enrollment, conceptual-point persistence and replays, plus simulated speech lifecycle, permission denial, stopping and late microphone grants. Actual microphone/speaker quality requires a student-led device check.

### Server algebra grounding

Diagnosis also runs the bounded checker in a Node worker with a 5-second deadline, a 96 MB heap limit and at most two simultaneous checks per app process. Verified counterexamples override contradictory model claims; cancellation conditions are retained. General equations, proofs and unsupported notation remain provisional. Worker assets are prepared by predev/prebuild/pretest and explicitly included in the diagnosis route's deployment trace. No model call or long CAS operation holds a database transaction.


Reproducible synthetic fixtures are in tests/fixtures (rendered handwriting-font maths and generated speech; neither is a real student's recording). Live UI validation can be run with npm run test:e2e -- tests/browser/coach.spec.ts tests/browser/voice.spec.ts; it requires the configured Neon and Cloudflare services. Browser speech is simulated in automation; the Cloudflare recording endpoint is also checked with the synthetic WAV.


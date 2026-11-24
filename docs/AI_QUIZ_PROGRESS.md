# Live AI and active recall — 5 November 2026

The subsequent [MAT1512 pilot](MAT1512_INGESTION.md) now provides real course content and supersedes the earlier content-setup status below.

## What now works

- **Local AI:** portable Ollama 0.40.14 for Windows ARM64 is running on `127.0.0.1:11434`, with cloud access disabled. The official archive's GitHub asset SHA-256 digest was verified. Downloaded `llama3.2:1b` and `nomic-embed-text`; actual chat, embeddings, ingestion into Neon and streamed RAG retrieval passed. The smaller chat model fits this CPU-only laptop's available memory.
- **Cloudflare Workers AI:** browser OAuth completed through Wrangler. Credentials remain in the ignored workspace profile; no API token was pasted into chat or saved in the frontend. Live BGE embeddings, pgvector retrieval and streamed Llama chat passed. Quizzes use a JSON-capable Cloudflare model and validate the result before saving. No plan was upgraded; calls use the Workers Free allocation.
- **Live tutor selection:** the toolbar explicitly separates sample responses, configured live AI, local Ollama and Cloudflare. Signed-in learners default to live inference, including on the sample reading. Anonymous sample responses remain labelled. Model citations over sample reading remain illustrative.
- **Quiz engine:** `POST /api/quiz/generate`, `POST /api/quiz/submit` and `/study/[unitId]/quiz` are implemented. Generation reads up to three ingested passages and provides multiple-choice and short-answer questions. The default heuristic makes extractive cloze practice without model calls. Local/Cloudflare AI use JSON output and fall back explicitly when unavailable or invalid.
- **Persistence:** existing `QuizQuestion` and `StudentMastery` models are used. `QuizAttempt` tracks learner ownership, expiry and the saved result. Answer keys stay server-side until grading. Submission calculates percentages and per-outcome scores, updates mastery atomically and counts each completed attempt once. Replaying a submitted attempt returns its saved result. Retry creates a fresh attempt.
- **Interface:** responsive question cards, answer progress, correct/incorrect feedback, source links, percentage results and retries. Short answers use exact source terms with case/whitespace normalization, preserving mathematical signs. This is practice grading, not essay evaluation or symbolic mathematics.

## Verification evidence

```text
npm run build
  Next.js 16.4.5 (webpack)
  Compiled successfully in 7.3s
  Finished TypeScript in 20.3s
  Generating static pages (8/8)
  /api/quiz/generate, /api/quiz/submit, /study/[unitId]/quiz registered
  exit 0

npm test
  tests 44, pass 44, fail 0

npm run test:e2e
  6 passed (32.8s), desktop/mobile Chrome

npm run validate
  The schema is valid

npm run ai:check -- ollama
  Provider: ollama; chat: llama3.2:1b; embeddings: nomic-embed-text
  PASS live embedding: 768 finite dimensions.
  PASS live model response: 7 plus 9 equals 16.

npm run ai:check -- cloudflare
  Provider: cloudflare; chat: @cf/meta/llama-3.2-3b-instruct
  PASS live embedding: 768 finite dimensions.
  PASS live model response: 7 + 9 = 16.
```

With the production app running on `http://localhost:3200`, the live integration script verified:

```text
PASS real Cloudflare embeddings ingested three passages into Neon pgvector.
PASS browser quiz: six questions, no exposed keys, 5/6 = 83%, source feedback and three transactional mastery updates.
PASS concurrent replay is idempotent; another learner gets 404; forged score/identity gets 400.
PASS mobile layout and fresh retry reset the score without overwriting the completed attempt.
PASS live Cloudflare RAG: query embedding, unit-filtered pgvector retrieval, streamed model answer and real chunk citations.
PASS signed-in preview defaults to live AI rather than preset responses.
PASS local Ollama RAG: actual Nomic ingestion, pgvector retrieval and streamed llama3.2 answer.
PASS requested Cloudflare quiz returned 4 validated questions; actual generator: cloudflare.
Temporary study content, quiz attempts and verification learners cleaned up.
```

The complete live script exited 0. The Cloudflare JSON-model probe also returned HTTP 200, `finish_reason: stop`, and two validated AI questions; the final app API returned four validated Cloudflare questions. Source IDs, evidence quotations and answer formats were checked. The browser screenshot [active-recall-quiz.png](active-recall-quiz.png) shows the actual six-question extractive test with its 83% result.

The migration was checked on a temporary child branch before applying to production. Both deployments succeeded. The temporary branch was removed; a final listing shows only `production`. Live tests use synthetic learners, outcomes and criteria labelled as verification data, then remove them. No official SAQA criteria or textbook content were invented for the permanent catalog.

## Running it

From this app directory:

```powershell
npm run ollama:serve
# In another terminal:
npm start -- --hostname localhost --port 3200
```

The Ollama server and Next.js production server are currently running. Open [the app](http://localhost:3200), create/sign into a learner account, and open the study preview. Signed-in tutor conversations use live AI by default. Choose Cloudflare or Ollama in the toolbar to override the configured default.

For quizzes, open **Practice active recall** from a course unit with ingested text. The public preview has no ingested database records and awards no mastery. Register reviewed curriculum and ingest the actual study guide before expecting a permanent course quiz. Temporary test units were cleaned up.

To repeat the complete live verification while the app is running:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3200'
npm run test:quiz:live -- --local
```

Use `npm run cloudflare:login` if the local OAuth session needs reauthorization. Wrangler refreshes short-lived access tokens automatically. Hosted deployments need a scoped Workers AI API token; the local CLI profile is not copied to hosting. Model weights and private profiles are under the ignored `../work` directory. The portable Ollama launcher changes only its child process's profile, leaving the user's actual Windows profile unchanged.

## Issues handled and remaining limits

- Ollama could not create its default home-directory key even after filesystem permission was granted. The portable launcher uses an isolated workspace profile instead. Model downloads completed successfully.
- The first Cloudflare browser login timed out and could not write to the default config folder. Retried with a workspace profile; the user completed sign-in.
- The initial Cloudflare chat model returned HTTP 410. Switched to the available Llama 3.2 model and verified live responses.
- Cloudflare sometimes emits digit-only `delta.content` values as JSON numbers. The AI SDK requires strings. A streaming adapter normalizes only finite numeric deltas, preserving other fields/errors, UTF-8 boundaries and citation text. A regression test and repeated live streams pass.
- The smaller Cloudflare chat model sometimes exceeded the quiz JSON output budget. Quiz generation now uses a JSON-capable Llama 3.3 model; syntax and grounding checks still fail over to extractive practice rather than saving invalid questions.
- A concurrent remote submission encountered the default connection-acquisition wait limit. The quiz transaction now allows a longer acquisition wait; concurrent retries passed without duplicate mastery counts.
- Windows sandbox build-directory races required serial directory preparation and preserving the precreated directories on Windows. The final `npm run build` passes. Other platforms keep Next's normal clean-build behavior.
- `npm audit --omit=dev` reports **9 dependency advisories (5 high, 4 low)** in the existing Prisma/Zod/math dependency trees. Suggested fixes include major version changes; no forced upgrade or dependency overrides were applied. This remains dependency-maintenance work.

Neon AI Gateway stays pending on Free as previously requested. Public frontend hosting, password-reset email delivery and authoritative curriculum content remain separate setup tasks. Cloudflare's [free allocation and limits](https://developers.cloudflare.com/workers-ai/platform/pricing/) apply; the app does not upgrade the account. See the [OpenAI-compatible endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) and [JSON mode documentation](https://developers.cloudflare.com/workers-ai/features/json-mode/) for provider details.

# Changelog


## 19 November 2026 — Vela interface refresh

- Adapted the supplied design's sidebar, editorial typography, sage and clay accents, and dashboard cards to Vela's existing learning routes.
- Added a real weekly study chart to the dashboard and reorganized outcome mastery by module, with separate indicators for unpractised outcomes, scores, and due reviews.
- Focused the overview on enrolled modules and one welcome. Consolidated saved scratchpad work under Math Practice.
- Applied the shared visual system to the compact study workspace, quizzes, concept map, and learner tools.
- Added a public landing page and kept the learner sidebar in the authenticated workspace.
- Added fullscreen study focus, a remembered custom panel split and compact session navigation. Unified the scratchpad, notebook and visual sandboxes in Math Lab.
- Made the review queue start with an inline flashcard session, surfaced learning-evidence totals and displayed concept details alongside the map.

## 19 November 2026 — Academic Master and assessed concept graph

- Added a personalized dashboard briefing, reusable dock, prerequisite links, original short refreshers and a selectable concept DAG.
- Added private concept checks, transactional provisional BKT estimates, distinct-item deduplication, dated availability and separate tutor/cross-module context controls.
- Kept curriculum sources and grading in the current module; session-aware context uses authorized ancestors and excludes withdrawn modules.
- Added a readable context preview and own concept-data reset without changing notes, grades or completion.
- Evaluated local guided tutoring: fixed a grammar compatibility issue; the installed 1B model remains unsuitable. The optional larger-model download was paused at the user's request; Cloudflare remains default.



## 19 November 2026 — Module support, scaffolding and social learning



- Added a contributor-facing `.vela/` architecture and restrictions index, runtime tutor policy, explicit tool profiles and trusted module metadata overrides.

- Added live three-tier hint requests and capability-gated conceptual debate, with session grounding and response metadata.

- Added source-separated outcome evidence, deterministic study recommendations and focused due-review links.

- Added opt-in anonymous module rooms/shared quiet Pomodoro, version-anchored paragraph discussions and scoped moderation; additive social migration applied.

- Runtime verification results and limits are tracked in `.vela/engineering/feature-status.md`.



## 18 November 2026 — Private practice and mistake notebook



- Added account-owned immutable scratchpad copies with reflections, mistake filtering, pagination, text export and confirmed deletion.

- Saved raw mathematical inputs and historical row-operation declarations; reopened copies run fresh local checks and preserve domain restrictions. Notebook actions never award mastery or reading completion.

- Added bounded, strict API payloads, retry-safe UUID saves, transactional per-account capacity, private uncached responses and account-change protection.

- Applied the additive notebook migration through the existing reviewed SQL runner after the Windows native Prisma migration engine failed. Course conversion and source data are unchanged.



## 18 November 2026 — Real-unit tutor verification and conceptual sandboxes



- Verified cropped-photo transcription/diagnosis, conceptual grading with persisted points and replay safety, audio transcription, and browser voice turn-taking against real enrolled MAT1503 and MAT1512 sessions on desktop/mobile. Voice recognition/playback used browser mocks; recorded-audio backend checks used a synthetic WAV, not a physical microphone.

- Added reusable Canvas matrix transformations with determinant/area, singular cases, eigendirections, inverse/vector controls and area-preserving rotation previews.

- Added signed Riemann sums with sampling/refinement, true polynomial bounds and gated exact answers, plus independent two-sided approach/zoom and point-assignment controls.

- Connected registered lesson visuals and strictly validated streaming tutor frames to the shared models; added a standalone Visuals gallery and tutor-tools tab. No source conversion, session progress or mastery records are rewritten by exploration.

- Preserved source order across mixed widget tags and JSON fences. A live check exposed missing widget frames and misleading determinant-step labels from the former 3B chat default; Cloudflare chat now defaults to Mistral Small 3.1 24B, with an environment override retained. Verified actual matrix and Riemann frame parameters on enrolled sessions.



## 18 November 2026 — Reader integrity and free study activity



- Fixed the reproduced bookmark-toolbar duplication caused by identical sibling React keys; empty conversations now start at the top so welcome headings remain visible.

- Added an optional focused study timer, per-learner tab leases, bounded server-clock credit and transactional enrollment checks.

- Added private weekly goals, daily activity, module totals and a bounded streak on `/activity`, with a compact home goal card.

- Activity stays separate from assessed mastery, session completion and institutional attendance. No paid analytics provider or AI call is required.



## 17 November 2026 — Free transactional email



- Added a durable welcome/recall outbox, shared free-tier budgets, verified-recipient checks and Resend/Brevo adapters.

- Added explicit reminder consent, due-outcome digests, signed scanner-safe unsubscribe and consent-generation checks.

- Connected Resend's development sender to the approved test inbox; the operator confirmed welcome and recall previews arrived. Brevo activation remains blocked by phone verification. No learner was automatically subscribed.

- Added a local email worker/status commands and a protected job endpoint with an optional Cloudflare scheduler for a future public HTTPS deployment. Wider student delivery and bounce/complaint reconciliation remain pending.



## 17 November 2026 — Student experience and competitive gaps



- Added profiles, OTP verification UI, qualified staff memberships and aggregate analytics.

- Added deep-linkable sessions, previous/next navigation, per-module resume, source bookmarks, selected passages and restored inline marks.

- Added visible-only enrolled lesson search and a dedicated review queue/return prompts.

- Added public overview, draft operator policies, generated social image, sitemap/robots, independent global 404 and private-data-safe offline shell.

- Manual accessibility, legal/source-rights and production launch reviews remain pending. See the later email entry above for the sender connection and rollout limits.



## 17 November 2026 — Enrollment and module readiness



- Added qualification-module enrollment with active/completed/withdrawn states, atomic selection and owner-only changes.

- Signup now enters the qualification/module picker; the home dashboard and outcome tree show enrolled modules.

- Gated real study/quiz routes, tutor, notes, recall, progress, source files and figures by current enrollment. Completed enrollment permits review; withdrawal preserves personal work.

- Light appearance is now the default, regardless of system appearance; explicit dark choices persist.

- Repaired and published nine held MAT1503 source pages (222 valid formula spans and eight figures); completed 192/192 planned pages, including one source-compared blank page excluded from instructional retrieval. Added repeatable database/asset/vector readiness auditing; both modules passed their final coverage checks.



## 17 November 2026 — Frontend maintainability and accessibility



- Extracted workspace header, panel toggle, reader pane, citations and source preview components.

- Added semantic design tokens, persistent light/dark appearance and a skip link.

- Added page titles/Open Graph metadata and 60-second caching for public curriculum data. Authenticated study/quiz responses and learner APIs remain dynamic.

- Added Prettier formatting commands and contrast/theme regression checks.

- Split documentation into task-oriented guides.



## Historical development log



The following is preserved from the previous README. Counts, test results and service status describe their respective development snapshots, not current guarantees.



# Modular LMS learning workspace



Next.js **16.4.5** App Router application with a responsive learning workspace, streaming RAG tutor and authenticated content ingestion. Neon production now provides PostgreSQL/pgvector, managed Auth, an authenticated catalog Function and learner-scoped Realtime progress. Prisma is pinned to 6.19.0. The original seeded SQLite database and schema are preserved as a snapshot in `legacy-sqlite/`. See [Neon setup and verification](NEON_SETUP.md) for deployment evidence and limitations.



## Progress — 6 November 2026



**7 November recovery:** resumed the stopped bulk run after reconstructing damaged checkpoints from Neon and intact page caches. Recovery confirmed 89 published pages; conversion has since advanced beyond that checkpoint. Restored Ollama using a checksum-verified Windows ARM64 compatibility runtime, verified real embeddings and chat on port 11434, and resumed the queue to fill missing local vectors. Added flushed checkpoints with backups, a Node TLS database connection for the bulk process, OCR timeout cleanup and `npm run bulk:watch` for live progress. See [recovery details](BULK_CONVERSION.md#shutdown-recovery--7-november-2026) and [live counts](bulk-conversion-status.json).



Math-aware bulk conversion is running across **547 selected pages** from the guide and Stewart chapters 1–5. A persistent local Marker/Surya worker uses the native Adreno OpenCL backend, overlaps OCR with embedding publication, and checkpoints pages for pause/resume. All five units now have structured readings. See [bulk operation and verification](BULK_CONVERSION.md), [current counts](bulk-conversion-status.json), and the [math pipeline](MATH_PIPELINE.md). Conversion is ongoing; automated OCR is distinguished from source-compared readings.



The first real module is ingested: [MAT1512 coverage, course links and verification](MAT1512_INGESTION.md). The retained baseline has 995 legacy chunks per provider; structured chunks are added as conversion proceeds, with protected links to original PDF pages and preserved source figures.



### Completed



- Added resumable bulk math OCR, hash-checked page/embedding caches, validation with higher-resolution retries, review holds, private extracted figures and reader pagination. Verified checkpoint resume and real publication to both provider spaces. Full-scope completion remains in progress.



- Added local Marker parsing, strict structured-document/LaTeX validation, formula-safe display boundaries, persisted visual blocks, interactive limit/tangent/area components and source/review provenance. Math-aware unit tutoring excludes legacy extraction and clearly states pilot coverage.



- Ingested 547 selected pages from the supplied MAT1512 guide and Stewart chapters 1–5. Added original-PDF reading, SHA-checked source links, module facts, curriculum provenance, readable-prose quiz selection and deduplication between embedding providers.

- Added Cloudflare Workers AI chat and 768-dimensional BGE embeddings, with browser-based Wrangler OAuth for local development. Provider credentials stay server-side; Cloudflare and Nomic vectors remain isolated by provider/model/endpoint.

- Added an explicit tutor-source selector: preset sample responses, live Ollama, or live Cloudflare. Signed-in learners can ask real questions over the sample reading; its criteria remain clearly illustrative. Live course RAG requires material embedded with the selected provider.

- Built the active recall engine: `/api/quiz/generate`, `/api/quiz/submit` and `/study/[unitId]/quiz`. It uses ingested content, persists questions and private keys in `QuizQuestion`, and tracks authenticated, expiring, idempotent attempts in `QuizAttempt`. Submission transactionally updates existing `StudentMastery` records.

- Added extractive multiple-choice/short-answer practice without any model key, validated AI generation with an explicit fallback notice, immediate submission feedback, source links, percentage scores, mobile layout and fresh retries.

- Deployed Postgres, Auth, Functions and Realtime to the existing Neon `Vela` project, production branch. Applied all six migrations and the UNISA seed; verified constraints against the real database. AI Gateway remains pending by choice on the Free plan.

- Upgraded to Next.js 16 for the supported Neon Auth integration. Added sign-up, sign-in, sign-out and reset-password screens; real study workspaces and tutor requests require a session. The preview stays public and staff ingestion retains its bearer token.

- Added an authenticated Function-backed catalog and sealed, learner-scoped live mastery overview. Verified two real learners, session restoration, JWT verification, committed database changes arriving through Realtime, and learner isolation. Temporary accounts and data were cleaned up.

- Defined the seven core LMS models: Qualification, Module, StudyUnit, LearningOutcome, ContentChunk, QuizQuestion and StudentMastery, with reusable qualification–module links.

- Created the transactional, repeatable UNISA 90104–PSM seed with SAQA ID 103108, NQF exit level 7 and the five requested first-year modules: MAT1503, MAT1512, PHY1501, CHE1501 and BPT1501. The original SQLite database was seeded and verified; its snapshot is preserved in `legacy-sqlite/`.

- Added the PostgreSQL schema and migrations, pgvector extension, 1,536-dimensional vector storage and HNSW cosine index.

- Built `POST /api/ingest` and the shared `ingestStudyUnit` Server Action for raw text or parsed PDF text.

- Implemented 500-token embedding windows with 50-token overlap, Unicode-safe display text, token/byte offsets and batched OpenAI embedding requests.

- Added assessment-criterion models, explicit outcome–criterion mappings and the `curriculum:register` command for reviewed metadata. Ingestion validates the module, study unit, outcome and criterion relationships before embedding.

- Added bearer authentication, input limits, parameterized SQL, atomic persistence, rollback on failure and duplicate-request handling, including concurrent requests.

- Documented configuration, curriculum registration, request/response examples, vector search and deployment requirements.

- Built `/study/[unitId]` with independent reading/chat panels, mobile panel switching, adjustable reading size, learning outcomes and source-excerpt navigation. Original source text renders once rather than repeating overlapping ingestion chunks.

- Added Markdown with `remark-math`, `rehype-katex` and KaTeX/mhchem for equations and chemistry formulas. Raw HTML is suppressed and model citation links are restricted to retrieved source URLs.

- Built `POST /api/tutor` with query embeddings, study-unit-filtered pgvector cosine retrieval, Academic Master/PCK system prompts, configurable GPT-4o/llama3 streaming through Vercel AI SDK 6 and structured chunk/criterion citations.

- Added a clearly labelled `/study/demo` preview, deterministic sample tutor responses and an interactive tangent explorer. Preview criteria are illustrative, not official SAQA records.

- Added configurable Ollama/OpenAI/Cloudflare providers. The included `.env` selects local `llama3.2:1b` chat and `nomic-embed-text` embeddings, with no cloud fallback or paid API key needed for local mode.

- Added a non-destructive upgrade for 768-dimensional vectors alongside existing 1,536-dimensional vectors. Retrieval and ingestion fingerprints now distinguish provider, model, dimensions and endpoint. Re-embedding identical material does not repeat its reading text.



### Verification completed



| Check | Result |

| --- | --- |

| Automated tests (`npm test`) | **60 passed**, including bulk scope/quality checks, figure integrity, reading deduplication, PDF range/version checks, quiz grading, ingestion and RAG |

| Prisma schema validation (`npm run validate`) | Passed |

| TypeScript checks (`npm run typecheck`) | Passed |

| Production build (`npm run build`) | Passed on Next.js 16.4.5, including auth, catalog and live-progress routes |

| Live Neon services (`npm run test:neon`) | Passed against production: Postgres, Auth, JWT-protected Function and isolated Realtime browser updates; fixtures cleaned up |

| Production HTTP smoke tests | GET returned 405; invalid bearer token returned 401; malformed JSON and invalid payload returned 400 |

| Desktop/mobile browser checks (`npm run test:e2e`) | **8 passed** in Chrome against the production build: reader, mathematics, learning outcomes, interactive graph, mode switching, streaming, citations and retries |

| Tutor production HTTP checks | GET returned 405; invalid mode returned 400; foreign origin returned 403; same-origin PCK SSE carried the answer, chunk/criterion citations and completion event |

| Live AI (`npm run ai:check -- ollama` / `-- cloudflare`) | Both providers generated real 768-dimensional embeddings and fresh chat answers; live RAG also verified against Neon |



The automated tests use embedded PostgreSQL through PGlite with pgvector and mocked model providers. Separately, `npm run verify` and `npm run test:neon` passed against the deployed Neon production services. Cloudflare live embedding and chat checks also pass using browser OAuth. Earlier ingestion/tutor HTTP smoke results in the table predate session authentication; the live tests verify protected access. See `AI_QUIZ_PROGRESS.md` for the latest end-to-end results.



### Remaining setup before live ingestion



- Neon Postgres with pgvector is configured, migrated and seeded. Pooled `DATABASE_URL` serves application traffic; direct `DATABASE_URL_UNPOOLED` serves Prisma migrations.

- For local mode, start Ollama with `llama3.2:1b` and `nomic-embed-text`. For OpenAI mode, set `OPENAI_API_KEY`. Set a strong `INGEST_API_TOKEN` for content ingestion in either mode.

- MAT1512's pilot units and user-supplied curriculum alignments are registered and ingested. Official SAQA/CAPS verification and a current tutorial letter remain necessary before labelling alignment or pass rules as official.

- The other four modules remain metadata-only. Register reviewed curriculum and ingest their actual material before expecting course quizzes or grounded tutoring there.



MAT1512 has protected original-PDF viewing and an ongoing structured bulk conversion. The reader provides source-page navigation, rendered math, original figures and interactive teaching blocks. See the live conversion status for current coverage. The endpoint accepts validated structured Markdown and legacy extracted text. A browser staff upload interface is not implemented. Neon backend services are deployed; the frontend runs locally and still needs hosting for public access.



## Live AI and active recall



Anonymous visitors see the sample tutor in **Sample responses · no AI** mode, a deterministic demonstration. Signed-in learners start with **Configured AI provider · live**. You can explicitly select **Live local AI · Ollama** or **Live cloud AI · Cloudflare** in the study toolbar. The same selector chooses a provider for real course units. Real units retrieve only passages embedded in that provider's exact embedding space; switching from Nomic to BGE requires re-ingesting the material with Cloudflare selected in `.env`.



Connect Cloudflare locally with `npm run cloudflare:login` and complete the browser consent. The script saves the account ID and `CLOUDFLARE_AUTH_MODE=wrangler`; OAuth tokens remain in the ignored workspace CLI profile and are refreshed by Wrangler. The app reads a short-lived token server-side. No token needs to be pasted into chat or browser code. Cloudflare supports the [OpenAI-compatible chat and embeddings endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/). Its [Free plan allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/) is currently 10,000 neurons/day; Free requests stop when the allowance is exhausted. No plan upgrade was performed. For a hosted frontend, configure a scoped `CLOUDFLARE_API_TOKEN`; local Wrangler OAuth is a development convenience, not hosted identity.



Cloudflare chat uses `@cf/meta/llama-3.2-3b-instruct`; embeddings use `@cf/baai/bge-base-en-v1.5` (768 dimensions). Structured quizzes use the JSON-capable `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, configurable with `CLOUDFLARE_QUIZ_MODEL`. These calls use the same free allocation. JSON syntax, question types, answer keys, source IDs and evidence are validated before saving. Set `AI_PROVIDER=cloudflare` to make it the ingestion/default provider. Generic `OPENAI_BASE_URL`, `CHAT_MODEL`, `EMBEDDING_MODEL` and old OpenAI keys are ignored in Cloudflare mode. `npm run ai:check -- cloudflare` generates a real embedding and a short live answer; it consumes a small amount of the free allocation.



On a unit with ingested course content, open **Practice active recall**. The default **Free practice · no AI needed** generator makes source-based cloze questions without a network/model request. You can also select Ollama, Cloudflare or the configured provider; unavailable models, exhausted quota or invalid JSON produce clearly labelled extractive practice. Nothing falls back to a paid provider automatically. Generation selects three readable ingested passages from a bounded candidate pool, excluding duplicate embedding copies and preferring complete prose for free recall practice. Very sparse or formula-only passages return a useful insufficient-text error instead of invented questions. The public preview has no ingested records and does not award mastery.



```http

POST /api/quiz/generate

Content-Type: application/json



{"studyUnitId":"your-unit-id","provider":"heuristic"}

```



The response contains an `attemptId`, one-hour expiry, actual generator, notice and public question IDs/options. Answer keys and explanations are withheld. Both quiz endpoints require a Neon session, apply same-origin checks and reject unknown/spoofed fields. Student IDs and scores come from the server.



```http

POST /api/quiz/submit

Content-Type: application/json



{"attemptId":"issued-attempt-id","answers":[{"questionId":"issued-question-id","value":"a"},{"questionId":"other-issued-question-id","value":"tangent"}]}

```



Submit every issued question once. Each question is worth one point. MCQ values are option IDs; short-answer values are exact accepted source terms, normalized for case, surrounding punctuation and whitespace. Mathematical signs are preserved. This is exact-term grading, not essay grading or symbolic equivalence. Feedback includes correct answers, explanations and source links. The overall score is a rounded percentage; each outcome's mastery is its latest normalized score from the questions in that outcome. Attempts increment once per completed quiz per assessed outcome, with a review scheduled one day later. Transactional locking, atomic upserts and persisted results make network retries idempotent. A retry from the UI creates a new attempt. No AI call is made during grading.



`npm run test:quiz:live` exercises actual Neon Auth, real Cloudflare embeddings, pgvector RAG, browser submission, persisted mastery, concurrent replay, identity/score tampering and fresh retries. Add `-- --local` to verify actual Nomic ingestion and local llama3.2 RAG as well. It creates and cleans up synthetic accounts and course data. Run against a suitable review environment. See [AI and quiz verification](AI_QUIZ_PROGRESS.md) for results.



## Local AI with Ollama



The application `.env` now selects Ollama. Install it from [Ollama](https://ollama.com/download), then run:



```sh

ollama pull llama3.2:1b

ollama pull nomic-embed-text

```



Keep the Ollama app running, or use `ollama serve` if it is not already serving. The configuration is:



```dotenv

AI_PROVIDER="ollama"

OPENAI_BASE_URL="http://localhost:11434/v1"

CHAT_MODEL="llama3.2:1b"

EMBEDDING_MODEL="nomic-embed-text"

EMBEDDING_DIMENSIONS="768"

```



No paid OpenAI key is needed in local mode. The SDK receives an `ollama` placeholder key and sends requests only to the configured endpoint; a saved `OPENAI_API_KEY` is not forwarded to Ollama. There is no automatic fallback to OpenAI. Ollama documents its [OpenAI-compatible API](https://docs.ollama.com/api/openai-compatibility).



```sh

npm run ai:check

npm run generate

npm run db:deploy

npm run dev

```



`ai:check` now generates a real embedding and a short model response, rather than just listing available models. Use `npm run ai:check -- ollama` or `npm run ai:check -- cloudflare` to choose explicitly. The database migration adds a `vector(768)` column and HNSW index, preserves existing `vector(1536)` values, and backfills their OpenAI provenance. On a new database, use `npm run db:setup` instead to also run the qualification/module seed.



This Windows ARM workspace also includes a portable Ollama installation in `../work/ollama`. Run `npm run ollama:serve`; the process uses an isolated profile and model directory in the workspace and disables Ollama cloud access. `npm run ollama:pull -- llama3.2:1b` and `npm run ollama:pull -- nomic-embed-text` install/resume its models. Keep the server running while using local AI. No login item or system service was added.



**Re-ingest study material after changing the embedding provider or model.** Existing OpenAI vectors cannot serve Nomic queries. Local retrieval matches the provider, model, vector width and base URL, so it will not silently compare incompatible spaces. The schema supports widths 768 and 1536; other widths require a schema change. Migration defaults label legacy rows as OpenAI; changing application defaults does not relabel or resize those vectors. Ingestion fingerprints use the upgraded pipeline version, so the first re-ingestion of older material creates a new ingestion while retaining its original records.



The 500/50 chunk boundaries still use `cl100k_base`. OpenAI receives its token arrays; Ollama receives Unicode-safe chunk/query text and uses its model's tokenizer. Nomic inputs receive `search_document:` or `search_query:` prefixes, following the [Nomic model instructions](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5). Vector dimensions are validated; mismatched results are rejected rather than padded. Only switching the base URL would leave the earlier hard-coded model names, numeric token inputs and storage width incompatible. Those differences are now handled by the provider configuration; the learner UI and streaming protocol are shared.



To switch back to OpenAI, set all corresponding fields and restart Next.js:



```dotenv

AI_PROVIDER="openai"

OPENAI_BASE_URL="https://api.openai.com/v1"

CHAT_MODEL="gpt-4o"

EMBEDDING_MODEL="text-embedding-3-small"

EMBEDDING_DIMENSIONS="1536"

OPENAI_API_KEY="YOUR_KEY"

```



The tutor uses the selected chat model independently of the embedding model. Local embedding requests allow 120 seconds and local chat allows 180 seconds for slower/cold model loads. `localhost` refers to the machine running Next.js, so a remotely hosted app needs a reachable Ollama endpoint rather than your desktop's loopback address. During implementation, no Ollama server was reachable on port 11434; local transport, model selection, vector storage/migration and retrieval were verified with mocks and PGlite, not a live Ollama model run.



## Learning workspace and tutor



Run `npm run dev`, then visit the [learning preview](http://localhost:3000/study/demo) to explore the interface without PostgreSQL or OpenAI credentials. This preview uses sample calculus text, explicitly illustrative criteria and deterministic streamed responses. It is separate from the live RAG path. The home page lists actual study units when the database is available and always links to the preview. A [desktop preview image](learning-workspace.png) is included.



For live material, open `/study/<studyUnitId>` after registering the unit and ingesting its text. The left panel displays the original source Markdown, mathematics/chemistry notation, learning outcomes and selectable source excerpts. The right panel provides **Academic Master** and **CAPS Didactics / PCK** modes, streaming answers, retry/stop controls and a new-conversation control. On small screens, use the Study material/Learning companion buttons to switch panels.



`POST /api/tutor` accepts:



```json

{

  "query": "Why do we take a limit when defining a derivative?",

  "studyUnitId": "YOUR_STUDY_UNIT_ID",

  "mode": "academic",

  "history": [

    { "role": "user", "content": "What does a secant slope represent?" },

    { "role": "assistant", "content": "It represents the average rate of change over an interval." }

  ]

}

```



`mode` is required and must be `academic` or `pck`; `history` is optional. The query is limited to 4,000 characters and 2,048 tokens. History permits at most 12 user/assistant messages, each up to 4,000 characters and 20,000 characters in total. Client-supplied system messages are rejected.



The live tutor embeds the query in the active ingestion space: Nomic/768 dimensions locally, or OpenAI/1,536 dimensions in the supplied cloud profile. It retrieves up to six chunks with cosine similarity at least 0.2, filtered by study unit, embedding provider/model/dimensions and endpoint. It constructs a system prompt containing those passages and their criterion mappings, then uses the configured chat model through `@ai-sdk/openai`/`streamText`. With no relevant passages, it returns an evidence-insufficiency response without calling the chat model or fabricating citations.



The response is an AI SDK UI message SSE stream, consumed with `useChat` and `DefaultChatTransport`. A persistent `data-citations` part supplies server-built chunk IDs, titles, excerpts, source URLs, criterion metadata and the mode used for that answer. Text follows as streaming deltas. Citation links open the specific excerpt in the reading panel, including the criterion description and its stored source link. Retrieved-source cards describe candidate evidence; they do not certify that every passage supports every sentence.



Academic mode emphasizes subject understanding and worked reasoning. PCK mode emphasizes misconceptions, representations, classroom activities and formative assessment. Without authoritative CAPS extracts, teaching suggestions are explicitly distinguished from verified CAPS requirements. Neither mode awards student mastery.



Live tutoring requires PostgreSQL, ingested chunks in the selected embedding space and an available model provider (running Ollama locally, or an OpenAI API key for cloud mode). The student reader/tutor currently has no login or enrolment policy; integrate your application's session and course-access checks in both the study page and tutor route when restricting course materials. The staff ingestion bearer token is never sent to the learner UI. Cross-origin browser tutor requests are rejected. Chat history is held in browser memory and is not persisted across reloads. Query embedding and model streaming propagate request cancellation; chat timeouts are 180 seconds locally or 60 seconds for OpenAI.



## Setup



Use Node.js 22 LTS and PostgreSQL with pgvector installed. From this directory:



```sh

npm install

# Copy .env.example to .env if needed; configure its values.

docker compose up -d --wait

npm run db:setup

npm run dev

```



Docker is optional if you already have PostgreSQL with pgvector. Set `DATABASE_URL` to that server; the migration user must be able to enable the `vector` extension. This is a fresh PostgreSQL baseline, not an in-place conversion of SQLite. SQLite records are not imported automatically. `db:setup` generates the client, applies the migrations and runs the original UNISA qualification/module seed.



Required server environment variables:



| Variable | Purpose |

| --- | --- |

| `DATABASE_URL` | PostgreSQL connection URL |

| `AI_PROVIDER` | `ollama` for local inference or `openai` for cloud inference |

| `OPENAI_BASE_URL` | OpenAI-compatible server base URL; shared by chat and embeddings |

| `CHAT_MODEL` | Chat model name, e.g. `llama3` or `gpt-4o` |

| `EMBEDDING_MODEL` | Embedding model name, e.g. `nomic-embed-text` |

| `EMBEDDING_DIMENSIONS` | Expected width: 768 or 1536 |

| `OPENAI_API_KEY` | Required only for OpenAI mode; ignored for local mode |

| `INGEST_API_TOKEN` | Strong random secret for trusted ingestion callers |



Generate a token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep both secrets out of browser code and public environment variables.



## Register a reviewed curriculum mapping



The seed contains no official learning outcomes or assessment criteria. Register a real study unit, learning outcome and criterion from reviewed curriculum/SAQA material. Save JSON using this shape, replacing every placeholder with verified data:



```json

{

  "moduleCode": "MAT1512",

  "qualificationCode": "90104",

  "stream": "PSM",

  "studyUnit": {

    "code": "REPLACE_WITH_UNIT_CODE",

    "title": "REPLACE_WITH_UNIT_TITLE",

    "position": 1

  },

  "learningOutcome": {

    "code": "REPLACE_WITH_OUTCOME_CODE",

    "description": "REPLACE_WITH_APPROVED_OUTCOME",

    "position": 1

  },

  "assessmentCriterion": {

    "code": "REPLACE_WITH_CRITERION_CODE",

    "description": "REPLACE_WITH_VERIFIED_SAQA_CRITERION",

    "sourceUrl": "https://example.org/replace-with-authoritative-source"

  }

}

```



```sh

npm run curriculum:register -- path/to/reviewed-curriculum.json

```



This transactional upsert prints the module code and the three database IDs needed below. It creates an explicit outcome–criterion mapping and reuses criteria with the same qualification/code. SAQA qualification ID `103108` is not an assessment criterion code. The script records the metadata you provide; it does not verify the source's authority automatically.



## POST /api/ingest



```sh

curl -X POST http://localhost:3000/api/ingest \

  -H "Authorization: Bearer YOUR_INGEST_API_TOKEN" \

  -H "Content-Type: application/json" \

  --data @request.json

```



`request.json`:



```json

{

  "moduleCode": "MAT1512",

  "studyUnitId": "ID_FROM_REGISTRATION",

  "learningOutcomeId": "ID_FROM_REGISTRATION",

  "assessmentCriterionId": "ID_FROM_REGISTRATION",

  "sourceName": "MAT1512 study unit 1",

  "text": "The raw study-unit text goes here..."

}

```



For parsed PDF output, replace the top-level `text` field with:



```json

"parsedPdf": { "text": "The extracted PDF text...", "numpages": 8 }

```



Provide exactly one of `text` and `parsedPdf.text`. Additional PDF metadata is ignored. Binary PDF parsing/OCR happens before this endpoint. A request covers one outcome and one reviewed criterion. Submit sections mapped to different criteria as separate requests; overlap stays within each request.



New ingestion returns HTTP **201**; an identical retry returns **200** with `reused: true` and does not call the embedding provider again after the original transaction commits:



```json

{

  "ingestionId": "generated-id",

  "chunkCount": 3,

  "reused": false,

  "moduleCode": "MAT1512",

  "saqaId": "103108",

  "learningOutcomeId": "existing-outcome-id",

  "assessmentCriterionId": "existing-criterion-id",

  "embeddingModel": "nomic-embed-text",

  "embeddingProvider": "ollama",

  "embeddingDimensions": 768,

  "tokenizer": "cl100k_base",

  "chunkSize": 500,

  "overlap": 50

}

```



Errors return `{ "error": { "code": "...", "message": "..." } }`: 400 invalid input/JSON, 401 invalid token, 413 input limit, 415 content type, 422 curriculum mismatch, 502 invalid provider response, 503 missing configuration/temporary embedding failure, or 500 unexpected storage failure. Responses do not expose SQL, keys, study text or provider error bodies.



The Server Action `ingestStudyUnit(input)` accepts the same object and returns `{ ok: true, data }` or `{ ok: false, status, error }`. It requires the same bearer token on the incoming `Authorization` header. For a browser-based staff UI, replace bearer authentication in both entry points with your application's staff-session/role check; do not serialize the shared token into React client components. The Route Handler provides `/api/ingest`; Next.js manages Server Action transport URLs. See the [Next.js Route Handler documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route).



## Processing and storage



1. Validate that the outcome belongs to the supplied study unit and UNISA module. Its explicitly mapped criterion must belong to a qualification containing that module. No criterion is guessed from study text.

2. Encode with `cl100k_base`: **500-token windows**, stride **450**, exactly **50 overlapping tokens**. The last chunk can be shorter. No redundant overlap-only trailing chunk is created.

3. Generate vectors in the configured space: local Nomic uses 768 dimensions, text batches of at most eight and a 120-second timeout; the supplied OpenAI profile uses 1,536 dimensions, token-array batches of at most 32 and a 30-second timeout. pgvector stores and indexes vectors; the model endpoint generates them. See the [official OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings) for the cloud profile.

4. After all vectors are validated, lock the outcome and save the ingestion and all chunks in one transaction. Any storage failure rolls back all writes. A composite foreign key keeps chunk outcome/criterion IDs consistent with the ingestion. SQL values are parameterized.



Module association follows `ContentChunk → LearningOutcome → StudyUnit → Module`. `AssessmentCriterion` links directly to each ingested chunk and its qualification. `Ingestion` stores the source text, source metadata, provider/model/dimensions/base URL and pipeline settings. Token offsets are zero-based, start-inclusive/end-exclusive. UTF-8 text boundaries expand to complete characters if a token boundary bisects a symbol; byte offsets record the text slice. OpenAI embeds the exact canonical token windows; Ollama embeds their Unicode-safe text using its own tokenizer.



Limits: **2,000,000 request bytes**, **1,000,000 UTF-8 text bytes**, **100,000 source tokens**. Authentication precedes body parsing. Fingerprints cover content, mapping, source metadata and pipeline settings. Concurrent identical requests may both generate embeddings, but save only one ingestion. Changed content or mapping appends a new ingestion rather than replacing old content. Other writers should take the same outcome-row lock when allocating content positions.



The migrations enable pgvector and create HNSW cosine indexes for both supported vector widths. Example local Nomic search (the tutor additionally filters by study unit):



```sql

-- Bind $1 to a Nomic query vector, $2/$3 to module/criterion,

-- and $4 to the endpoint used when ingesting that material.

SELECT c."id", c."body", 1 - (c."embedding768" <=> $1::vector) AS similarity

FROM "ContentChunk" c

JOIN "LearningOutcome" lo ON lo."id" = c."learningOutcomeId"

JOIN "StudyUnit" su ON su."id" = lo."studyUnitId"

JOIN "Module" m ON m."id" = su."moduleId"

JOIN "Ingestion" i ON i."id" = c."ingestionId"

WHERE m."institution" = 'UNISA' AND m."code" = $2

  AND c."assessmentCriterionId" = $3 AND c."embedding768" IS NOT NULL

  AND i."embeddingProvider" = 'ollama' AND i."embeddingModel" = 'nomic-embed-text'

  AND i."embeddingDimensions" = 768 AND i."embeddingBaseUrl" = $4

ORDER BY c."embedding768" <=> $1::vector

LIMIT 10;

```



Use migrations rather than `prisma db push` to retain SQL constraints and the vector index. Original quiz and mastery models remain available. Keep quiz answers server-side; student identity, enrolment and staff roles belong to the application.



## Verification and deployment



```sh

npm test

npm run test:e2e

npm run validate

npm run typecheck

npm run build

npm start

```



Tests run the real PostgreSQL migrations and repository statements in PGlite with pgvector. They cover exact overlap/coverage, Unicode, both input formats, authentication, streamed size limits, invalid mappings, vector storage/cosine search, idempotence and rollback. Provider responses are mocked; tests do not send material to OpenAI or incur charges. These are embedded PostgreSQL integration tests, not tests of deployed database credentials or live embeddings. `npm run verify` separately checks the original UNISA seed and core constraints through Prisma against your configured PostgreSQL server.



Browser tests cover the desktop/mobile workspace, equations, the interactive graph, mode switching, streamed preview responses, citation navigation and retrying an unavailable tutor. Playwright uses installed Google Chrome on Windows; set `PLAYWRIGHT_CHANNEL` to choose another installed channel. On other platforms, run `npx playwright install chromium` first. The test runner starts a local development server on port 3100 if one is not already running.



To test an already-running production server, set `PLAYWRIGHT_BASE_URL` to its origin before running `npm run test:e2e`; the runner will not start or stop that server. Development and production use separate generated directories (`.next-dev` and `.next`) so a development session does not overwrite a production build.



The Node.js Route Handler allows 300 seconds; your host must support that duration. For larger workloads, split documents by criterion or move processing to a durable job queue. Configure deployment rate limits for your staff callers.



## UNISA metadata



The seed retains **90104–PSM**, SAQA ID **103108**, NQF exit level **7**, and the requested MAT1503, MAT1512, PHY1501, CHE1501 and BPT1501 modules. The [UNISA qualification page](https://www.unisa.ac.za/sites/corporate/default/Register-to-study-through-Unisa/Undergraduate-%26-honours-qualifications/Find-your-qualification-%26-choose-your-modules/All-qualifications/Bachelor-of-Education-in-Senior-Phase-and-Further-Education-and-Training-Teaching-School-subject-combination%3A-Physical-Science-and-Mathematics-%2890104-%E2%80%93-PSM%29) calls CHE1501 **General Chemistry IA** and currently lists **PHY1505 – Mechanics (Physics)**. Requested titles/codes remain in the seed with discrepancies in `Module.catalogNote`. No official SAQA assessment criteria have been fabricated.



## Companion and recall phase



Added three workspace layouts, structured answer cards, safe interactive quadratic widgets, a shared recall drawer with source-linked conversation cards, authenticated self-rating persistence and a learner-owned dashboard outcome tree. Voice currently supports bounded recorded turns through Cloudflare Whisper and browser speech playback; continuous bidirectional audio remains pending. See [implementation and verification](COMPANION_PROGRESS.md). The bulk ingestion process remains running; no schema migration or Prisma generation was performed.





## Study workspace redesign — 7 November



Fixed real-unit access by replacing the application native TLS driver with a separate Rust-free Prisma client and the PostgreSQL adapter. The bulk ingestion client remains unchanged. Added sign-in return navigation, a unified navigation bar, Reader/Balanced/Companion layouts, floating reading controls, a compact companion header, and a keyboard-accessible citation side drawer that preserves chat position. See [redesign and verification](WORKSPACE_REDESIGN.md).





## Personal notes and retention — 7 November



Added the learner-owned StudyNote model and deployed its additive migration. My Notes supports autosave, revision conflict protection, math preview and clipping companion cards. The header recall button opens a source-backed flashcard modal with due-outcome scheduling and Again/Good/Easy ratings. Tutor prompts now teach with Intuition First, micro-step scaffolding and Pause and Predict checkpoints. See [notes, scheduling and verification](NOTES_AND_RETENTION.md).





## MAT1512 conceptual sessions — 7 November



All five real units now open at /study/MAT1512-U1 through /study/MAT1512-U5 with four Vela-written milestones each, original worked examples, interactive SVGs and persistent session progress. Primary lessons no longer page through source OCR or display copied textbook figures. Source evidence remains available through lazy citation previews. The session seed includes math validation and source-overlap guards; 27 exact CAS checks verify worked examples. See [architecture, coverage and reproduction](MAT1512_SESSIONS.md).





## Completed conversion and granular progress



All 547 MAT1512 reference pages are converted with both embedding providers and no review holds. Real units now include a Source Library for converted text and illustrations, safe parameterized chat widgets, header session/mastery indicators, registered module/course counters and cross-tab mastery synchronization. See [PROGRESS_AND_WIDGETS.md](PROGRESS_AND_WIDGETS.md) and [conversion-audit.json](conversion-audit.json).



Cloudflare is the default AI provider. Ollama now uses compact, cited local answers and warm-model settings. See [PROVIDER_TUNING.md](PROVIDER_TUNING.md).



## Modular specifications and expanded MAT1512



Universal Core plus explicitly registered domain extensions now govern lesson generation and the pre-publication gate. MAT1512 is expanded to30 version2 sessions across five units. See [MODULAR_SPECIFICATION_SYSTEM.md](MODULAR_SPECIFICATION_SYSTEM.md) for authoring, onboarding, validation and publication commands.



## Attempt-first learning update



Spec1.1 / MAT1512 revision3 adds179 answer-gated exercises, stronger visible teaching, server-grounded active-session tutoring and a module-first library. See [ATTEMPT_FIRST_LEARNING.md](ATTEMPT_FIRST_LEARNING.md).



## MAT1503 onboarded



MAT1503 now has13topic units and78answer-gated Vela sessions under spec1.1. Original lessons and the192-page reference OCR queue have separate status. See [MAT1503_ONBOARDING.md](MAT1503_ONBOARDING.md) for scope, monitoring, recovery and verification.



## 18 November 2026 — Local mathematical practice and compact mobile controls



- Added a visual MathLive editor, local bounded CAS step verification and exact matrix row-operation feedback, with original generated variations and answers hidden until requested.

- Lesson exercises can open a scratchpad without receiving their hidden answer; the companion supports inserting visual mathematical expressions.

- Phones up to 380px use a single compact header and accessible utility drawer, preserving the existing notes, sources and recall state.





## 18 November 2026 — AI learning tools



- Added cropped-photo transcription with mandatory correction/confirmation, provisional numbered-step diagnosis and optional local algebra checks.

- Added session-bound teach-the-tutor attempts, evidence-checked AI feedback, transactional mastery and capped improvement points, with owner-safe replay handling.

- Added opt-in browser dictation, streamed sentence playback, hands-free turns and reviewed Cloudflare recording fallback. Capture stops on context changes, hiding and cancellation.




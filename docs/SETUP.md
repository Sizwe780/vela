# Setup

## Runtime and configuration

Use a Node.js release supported by the installed Next.js version and npm. This project currently uses Next.js 16, React 19 and Prisma 6.19. PostgreSQL must support pgvector. Hosted services are configured in `neon.ts`; existing deployment details are in [NEON_SETUP.md](NEON_SETUP.md).

```powershell
npm ci
Copy-Item .env.example .env
```

Skip copying if `.env` already exists. Configure the database URLs, Neon Auth URL/JWKS/cookie secret and required service URLs from the deployment. Keep secrets out of Git and chat. `.env.example` documents names; never copy another learner's credentials.

`npm run build` generates only the application's adapter-based Prisma client. For a new database, review migrations and run `npm run db:deploy`; seeding and registration are explicit administrative actions. Do not run `db:setup` on an established database without reviewing its seed behavior.

## AI providers

`AI_PROVIDER=cloudflare` selects Workers AI. Local development can use `npm run cloudflare:login` and `CLOUDFLARE_AUTH_MODE=wrangler`; finish authorization in the opened browser. Hosted deployments require a Workers AI API token and account ID. Keep credentials in the ignored environment file. Free quotas are provider-managed; Neon AI Gateway is pending.

For local inference, run `npm run ollama:serve` and `npm run ollama:pull`, then use the provider selector or `AI_PROVIDER=ollama`. Configure `OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL` and embedding dimensions consistently. A sample response is explicitly labelled as a preview; it is not evidence of live AI. See [PROVIDER_TUNING.md](PROVIDER_TUNING.md).

## Run and verify

```powershell
npm run typecheck
npm run validate
npm test
npm run build
npm start -- --port 3200
```

On Windows ARM64, tests/scripts using platform user information need the compatibility preload:

```powershell
$env:NODE_OPTIONS='--require=./scripts/windows-runtime.cjs'
npm test
```

Browse `http://localhost:3200`, create an account, choose your qualification and enroll in modules at `/onboarding`. Existing learners also select their modules before reopening real units. `/study/demo` is the public preview. Notes, recall, quizzes, source PDFs/figures and study pages require a learner session and module enrollment. Light mode is the default unless the learner explicitly saves dark mode. Public catalog/lesson data has a 60-second cache; personal APIs use private, uncached responses.

## Content and conversion

Publication and source conversion are separate. Follow [MAT1503_ONBOARDING.md](MAT1503_ONBOARDING.md), [MATH_PIPELINE.md](MATH_PIPELINE.md) and [BULK_CONVERSION.md](BULK_CONVERSION.md). Check `npm run mat1503:status` or `npm run mat1503:watch`; the watcher does not control the worker. Do not regenerate the original binary Prisma client or stop unrelated Node processes while conversion runs.


## Public origin, policies and operator roles

Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin before public indexing. Local development robots disallow crawling. The public policies distinguish approved retention targets from deployed enforcement. Complete `.vela/legal/launch-readiness.md` before treating the notice as a final compliance deliverable; an operator flag is not a legal certification.

See [COMPETITIVE_GAPS.md](COMPETITIVE_GAPS.md) for verified admin setup and feature limitations. Neon authentication email verification uses a one-time code entered on `/profile`. It is separate from the product welcome/recall queue. Resend development-inbox sending is connected; see [EMAIL_SETUP.md](EMAIL_SETUP.md) for consent, free limits, local scheduling and requirements for wider delivery.


## Saved lesson practice and scientific references

Apply the additive `20261127200000_lesson_attempts` and `20261127210000_attempt_submission_history` migrations before deploying the corresponding application build. Use the normal migration deployment on supported hosts. The reviewed Windows fallback is:

```powershell
node scripts/apply-enrollment-migration.mjs --migration=20261127200000_lesson_attempts
node scripts/apply-enrollment-migration.mjs --migration=20261127210000_attempt_submission_history
```

`npm run build` generates only the application's `appClient`; do not regenerate the native client used by an active conversion worker. Lesson timers start automatically and pause after 10 seconds without activity. The earlier autoStartTimer profile preference is retained only for compatibility. Formative answers have private Neon persistence plus owner/session/version-scoped local device drafts; clearing device practice cache does not delete server answers or assessed evidence.

Contextual reference drawers use checked-in public factual snapshots and require no paid API key. PubChem refresh (`python scripts/update-element-reference.py`) is an explicit maintenance action, not part of a build. Sources, limitations, testing and rollout tasks are in `.vela/engineering/reference-data-and-practice.md` and `.vela/engineering/learning-tools-task-checklist.md`.

When running separate Playwright commands concurrently, give each its own `--output` folder; otherwise one run can remove another's trace files. A single normal `npm run test:e2e` invocation coordinates its own shared output.


### Local mathematical practice
The capability-scoped Practical Lab uses the existing MathLive and Nerdamer dependencies, with no AI key or added server process required for symbolic checks. Browser checks run in a cancellable eight-second worker; unsupported notation remains unverified. Working notes are separate and save/export only on explicit notebook actions. See [practice notebook](PRACTICE_NOTEBOOK.md) and `.vela/engineering/reference-data-and-practice.md` for grammar, domain and matrix bounds. Preserve the bundled MathLive fonts and worker chunks when packaging the app.

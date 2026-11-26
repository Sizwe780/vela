# Production release — 26 November 2026

## Azure deployment

Deployed the current prebuilt standalone Next.js application directly to `vela-web-app` in `vela-prod-rg`, without GitHub Actions. Azure returned `RuntimeSuccessful`, with one successful instance and zero failed instances. Deployment ID: `8234fab8-b760-413f-b523-47a6a2e4b921`.

The public `/deployment-version.json` exactly matches local `.next/BUILD_ID`. The versioned SVG favicon, logo PNG and optimized 64px logo endpoint return HTTP 200. The landing page returns HTTP 200 and references the updated branding.

The first dynamic-page probe exposed missing production Neon Auth settings. Configured the confirmed production branch's auth URL/JWKS URL and a dedicated production cookie secret in Azure. After restart, `/`, `/auth/sign-up` and `/api/auth/get-session` returned HTTP 200. An unauthenticated real-unit URL redirects to sign-in with its return path retained.

## Lesson promotion

Promoted reviewed staging content into the existing production database, preserving stable session identities and learner tables. The serializable transaction committed and read-back verified 191 session Markdown bodies.

| Module | Promoted sessions |
| --- | ---: |
| MAT1503 | 78 |
| MAT1512 | 30 |
| BPT1501 | 5 |
| CHE1501 | 31 |
| PHY1503 | 17 |
| PHY1505 | 26 |
| TPS2601 | 4 |

Total: seven modules, 48 unit records, 191 current authored ingestions and 414 indexed chunks. The production-only retired BPT orientation session was retained rather than deleting learner references; the existing publication filter excludes that orientation from the reader.

Private content backup, source snapshot, plan, commit receipt and indexing checkpoint: `work/production-promotion-2026-11-26T06-47-26-980Z/` in the parent workspace. This is a content-only backup. An attempted Azure site archive download timed out and was marked `.partial.zip`; it is not a usable application backup.

## AI configuration and retrieval

Installed provider credentials privately in App Service settings. The initial Cloudflare token was active but lacked usable Workers AI permission. The user corrected its scope/account configuration; chat and embedding probes then returned HTTP 200.

Promoted indexes named the previous Cloudflare account endpoint, so the retrieval-space filter correctly excluded them. Generated fresh embeddings from stored chunk bodies using the corrected production account, with transactional per-ingestion writes and restart checkpoints. Production SQL read-back confirmed all 191 ingestions and 414 non-null vector chunks match the current endpoint. No old vectors were merely relabelled.

## Verification

Cloudflare and Groq passed authenticated production tutor checks with both expected rod-inertia values (`0.45` and `1.8`) and two citations restricted to the active session. OpenRouter passed the same check separately. Gemini's configured `gemini-3.1-flash-lite` model timed out/returned an upstream stream error. A provider model-list check and completion probe identified working `gemini-3.5-flash-lite`; configured that model in Azure and the ignored local environment before the final verification.

The subsequent combined run confirmed Gemini's live session retrieval and answer, but exposed an intermittent empty completion from OpenRouter's rotating `openrouter/free` model. Queried the provider's current zero-price model catalogue and probed a fixed free model. `nvidia/nemotron-3.5-lightning:free` returned both correct numerical values; configured it in Azure and the ignored local environment. The rotating model's isolated success was not treated as reliable final acceptance.

- `npm run typecheck`: passed.
- Both promotion/indexing scripts: `node --check` passed.
- Standalone packager: 5,792 files, 34,099,720 bytes; environment files excluded; required server, branding and generated-client files checked.
- Production mobile browser: one test passed, covering real lessons in all seven populated modules, real signup/enrollment, answer reveal controls and absence of KaTeX errors. Disposable learner cleanup completed.
- Final production desktop acceptance: `1 passed (2.4m)`. Covered signup, enrollment, real lessons in all seven populated modules, answer gates, KaTeX integrity and all four configured cloud tutors. Each provider returned HTTP 200, no stream error, both expected numerical values and two citations pointing only to `PHY1505-U6-S2`. Disposable learner cleanup completed.

Final configured chat models: Cloudflare remains the default; Groq uses `openai/gpt-oss-120b`, Gemini uses `gemini-3.5-flash-lite`, and OpenRouter uses the fixed zero-price `nvidia/nemotron-3.5-lightning:free` model. Local Ollama was not deployed to Azure or included in these cloud-provider checks. Free-provider capacity can still vary; the final pass records observed behavior, not an availability guarantee.

Final acceptance artifacts are under `work/production-release-accepted/`; the successful mobile run is under `work/production-release-mobile/`. Earlier failed diagnostic runs are retained separately, documenting the repaired auth, embedding-endpoint and provider-model configuration issues.

The release reused the existing reviewed application build; it did not change runtime application code or claim a new build run. Operational scripts, release tests and documentation were added in this release.

Follow the [direct Azure release runbook](../engineering/azure-release.md) for future deployments and promotions.

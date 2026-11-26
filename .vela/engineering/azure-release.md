# Direct Azure release

Use this path when GitHub Actions is unavailable. Never include environment files in the deployment archive or point production at the staging learner database.

## Application release

1. Run the repository checks and `npm run build` with the intended source revision.
2. Authenticate Azure CLI and confirm the target app and subscription.
3. Configure production `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, public site origin and the selected AI provider credentials in App Service settings. Confirm the auth URL belongs to the production Neon branch. Keep secrets out of logs and source control.
4. Use Linux Node 22 and startup command `node server.js`. Disable Oryx/server-side build for the prebuilt standalone package: `SCM_DO_BUILD_DURING_DEPLOYMENT=false` and `ENABLE_ORYX_BUILD=false`.
5. Run `./scripts/deploy-azure.ps1`. The packager includes standalone runtime files, static assets, public assets, generated clients, specs and Linux Sharp dependencies. It excludes environment files and Windows native packages. It downloads the pinned Linux packages if absent.
6. Wait for Azure `RuntimeSuccessful`, then compare `/deployment-version.json` with local `.next/BUILD_ID`. Check `/`, `/auth/sign-up`, `/api/auth/get-session`, branding assets and the optimized image endpoint. A deployment success alone does not establish app health.

## Lesson promotion and indexing

Set `PROMOTE_SOURCE_URL` to the reviewed staging database and `PROMOTE_TARGET_URL` to production, privately in the shell. Run `node scripts/promote-lessons.mjs` first for a content-only backup and plan. Inspect counts, stable session IDs and production-only records, then run with `--apply` for the authorized promotion. The runner rejects identity/position conflicts, checks concurrent lesson edits and commits curriculum and evidence changes transactionally. It does not migrate learner tables or delete production-only records.

Backups and promotion receipts are written under `../work/production-promotion-*`. Treat these as private source-content artifacts. Keep the `before.json` snapshot until release verification is complete; this is a content backup, not a complete database backup.

Embedding endpoint metadata is part of the retrieval-space identity. If the production Cloudflare account differs from the indexing account, run `node scripts/reindex-promoted-lessons.mjs <committed-promotion-directory>` with the production target and Cloudflare credentials configured. This generates fresh vectors from stored chunk bodies, updates vectors and endpoint metadata together per ingestion, and checkpoints completed lessons for restart. Never relabel an old index to conceal a provider mismatch.

## Live verification

`tests/browser/production-release.spec.ts` is disabled by default. Enable only for an explicitly authorized production release using `VELA_PRODUCTION_RELEASE_TEST=1`, `PLAYWRIGHT_BASE_URL=https://velastudy.app`, and the production database/auth settings. Run desktop and mobile projects. It creates and removes a disposable learner, enrolls that learner through the real API, loads real lessons, checks answer gates and math, and verifies active-session citations and example parameters from live tutors. `VELA_PRODUCTION_LESSONS_ONLY=1` omits live AI calls. The test never uses an existing learner's identity.

Distinguish provider credential probes from end-to-end tutor verification: the latter also requires working authentication, enrollment, matching embedding spaces and current lesson evidence.

For a provider-specific retry, set `VELA_PRODUCTION_TUTOR_ONLY=1` and `VELA_TEST_TUTOR_PROVIDERS=gemini` (or another comma-separated subset). Keep the default full test for final acceptance. A streaming HTTP 200 can still contain an error frame; the test checks both the stream and its cited lesson content.

## Reading-first workspace release verification

After Azure reports `RuntimeSuccessful` and the public build ID matches, run `tests/browser/reading-first.spec.ts` on both projects with the production database/auth configuration and `VELA_LIVE_RECALL=1`. This opts into real recall retrieval and rating for the disposable learner; without that flag the drawer response is mocked. Verify notes autosave, source and bookmark controls, hinted Companion opening/draft retention, guided pacing, pendulum fit, quantity/unit retries, encrypted download, wrong-passphrase rejection, and disconnected offline reload. Keep API/private HTML out of the service-worker cache.

Then run the authorized production-release test for the real multi-module lesson and tutor checks. Wait for the lesson pacing UI before testing answer reveals; assert the session heading rather than hidden unit-summary copy. Never treat a transient rollout response or cached branding asset alone as release acceptance. Test-only updates do not change the already-built runtime.

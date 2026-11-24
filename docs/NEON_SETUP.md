# Neon deployment and verification — 5 November 2026

This records the initial Neon setup. Local Ollama, Cloudflare Workers AI and the quiz engine were completed afterward; see [the latest AI and quiz verification](AI_QUIZ_PROGRESS.md) for their current status.

The existing **Vela** project (`square-grass-82468951`) in organization `org-wandering-mountain-07262725` is linked to branch **production** (`br-solitary-heart-bdak40mc`). Postgres, Auth, Functions and Realtime are deployed and tested. **AI Gateway is pending:** Neon rejected it on the Free plan, and the user explicitly chose to keep Free. `neon.ts` therefore sets `aiGateway: false`.

## Implementation

- Upgraded Next.js 15.5.29 to **16.4.5** for the installed Neon Auth SDK. Added the Auth proxy, catch-all handler, email/password forms, session-aware account menu and protected live workspaces/tutor. Password reset UI is implemented; email delivery and token redemption were not tested.
- Preserved Prisma 6 and its working Node.js driver. Application queries use pooled `DATABASE_URL`; migrations use direct `DATABASE_URL_UNPOOLED`. All three SQL migrations, including pgvector and both vector indexes, are applied. Seeded SAQA 103108, NQF 7 and the five requested UNISA modules. No official assessment criteria or study content were invented.
- Replaced the generated hello Function with a course catalog endpoint. It verifies Neon Auth JWT signatures and issuer through the injected JWKS URL, rejects anonymous access, and queries Postgres using a reusable `pg` pool registered with `attachDatabasePool`. The generated `hello` service key remains stable.
- Added `/api/catalog` to call that Function with the signed-in learner's JWT. The homepage shows its course counts.
- Added `/api/progress/live` to seal a parameterized StudentMastery query restricted to the authenticated learner. The React Realtime client updates the homepage's assessed-outcome count. Capabilities remain in memory, renew through an authenticated route, and are never written into URLs or logs. Account mismatch is rejected.
- Pulled eight service variables into the existing, ignored `.env`. Generated a random Auth cookie secret and staff ingestion token without printing either. Kept Ollama as the configured AI provider; no local Ollama server was available, so live chat/embedding inference remains unverified.
- Used installed project-local Neon agent skills for Postgres, Auth, Functions and Realtime. Localhost ports 3000 and 3200 are permitted Realtime origins. Add the eventual hosted frontend's origin to Neon Auth and `neon.ts` before publishing it.

## Command evidence

Final successful `neon deploy -y` output:

```text
Applying to branch production (br-solitary-heart-bdak40mc)
Applied changes
  ~ function hello
  ~ Realtime
Utilized services: Postgres, Neon Auth, Functions, Realtime
Pulled 8 Neon variables into .env
```

Database migrations were first checked on a temporary child branch, then deployed to production. The temporary branch was deleted afterward; a final branch listing confirmed only production remains.

```text
All migrations have been successfully applied.
Seeded UNISA 90104 - PSM and the five requested first-year modules.
Verified seed metadata, five modules, content hierarchy, mastery uniqueness/bounds,
foreign keys and cascading deletes. Fixtures rolled back.
```

`npm run build` exited **0**:

```text
Next.js 16.4.5 (webpack)
Compiled successfully in 10.6s
Finished TypeScript in 10.2s
Generating static pages using 7 workers (6/6)
Routes: /, /api/auth/[...path], /api/catalog, /api/ingest,
        /api/progress/live, /api/tutor, /auth/[path], /study/[unitId]
Proxy (Middleware)
```

Started the production build with `npm start -- --hostname localhost --port 3200`:

```text
Local: http://localhost:3200
Ready in 549ms
```

With `PLAYWRIGHT_BASE_URL=http://localhost:3200`, `node scripts/verify-neon.mjs` exited **0**:

```text
PASS protected APIs and deployed Function reject anonymous requests (401).
PASS two real Neon Auth sign-ups, reload session restoration, authenticated Function JWT + Postgres catalog (200, 5 modules).
PASS committed Postgres insert/update reach browser through Realtime without reload; second learner remains isolated; account mismatch rejected (409).
PASS sign-out revokes app access, wrong password displays error, sign-in succeeds, reset form renders. Email delivery was not exercised.
Verification fixtures and synthetic accounts cleaned up.
```

Further checks:

```text
npm test                  tests 34, pass 34, fail 0
npm run test:e2e          6 passed (19.4s), desktop and mobile Chrome
npm run validate          The schema is valid
npm run typecheck         exit 0
```

The live verifier deliberately creates two synthetic `example.invalid` learners and a temporary study unit, writes mastery rows, and removes them afterward. It expects the initial five-module seed. Run it against a review environment if the catalog changes. It does not send password-reset mail.

## Repeating deployment

From this `outputs` app directory, the working CLI invocation is:

```powershell
npx.cmd --yes --cache ../work/npm-cache neon@latest --config-dir ../work/neon-cli deploy
```

The workspace-local CLI directory holds authentication credentials and is ignored. Keep it private. `neon.ts` defines backend services; it does not host the Next.js frontend. The frontend is currently available locally at http://localhost:3200 while the development process remains running.

After pulling environment variables into a fresh checkout, generate missing app secrets with `node scripts/bootstrap-neon.mjs`, then build and start. Preserve the same cookie secret across frontend instances. To repeat browser tests, set `PLAYWRIGHT_BASE_URL` to the running frontend's origin and run `npm run test:e2e` or `npm run test:neon`.

## Failures and recoveries

- Global `npm i -g neon@latest` failed with Windows EPERM. Used `npx neon@latest` successfully (CLI 8.23.1).
- The default Neon config directory also hit EPERM. Used `../work/neon-cli`; browser login completed successfully.
- Automatic editor-plugin setup failed. Installed and consulted project-local Neon agent skills instead.
- The first full deploy was rejected because AI Gateway requires a paid plan. Left Gateway pending as instructed; the other four services deployed successfully.
- Applying Realtime origin changes initially required `--update-existing` or `-y`; retried with `-y` and succeeded.
- The first remote constraint verification exceeded Prisma's five-second interactive-transaction default. Increased the verification-only timeout to 60 seconds; the check then passed and rolled back its fixtures.
- Build attempts encountered Windows EPERM creating generated cache directories. Moved the old Next.js 15 cache into the workspace scratch directory and precreated missing generated directories. The final Next.js 16 build passed.
- npm reported an internal Better Auth fetch peer-version warning and old native-module cleanup warnings during upgrade. No dependency overrides were added; build, Auth and browser tests passed.

Still unverified: live Ollama inference/embeddings, paid AI Gateway, password-reset email delivery/redemption, and public frontend hosting. No organization upgrade or paid AI request was made.

# Contributing

## Code organization

`app/` contains routes and page shells; `components/workspace/` holds presentation components, while the workspace controller owns chat/session coordination. `lib/study/catalog.ts` caches public curriculum only. `lib/` holds domain services; `prisma/` contains models/migrations; `content/` contains original reviewed lessons.

Use semantic variables from `app/tokens.css` for colors, spacing and radii. New component styling can use CSS Modules (see the theme toggle). Test light and dark palettes, narrow screens, focus order, and math/diagram readability. Preserve chart colors and labels; do not invert images.

## Formatting and checks

```powershell
npm run format
npm run format:check
npm run typecheck
npm run validate
npm test
npm run build
npm run test:e2e
```

Use `NODE_OPTIONS=--require=./scripts/windows-runtime.cjs` for Windows ARM64 test runs. Set `PLAYWRIGHT_BASE_URL=http://localhost:3200` to test an already-running app. Browser tests may create temporary learners and require configured Neon Auth; live AI checks are opt-in and may consume provider quota.

Formatting intentionally excludes generated clients and authored content files. Keep JSX readable and extract presentation components at meaningful boundaries. Log operational failures using `logServerError` without printing secrets or learner data.

## Learning content and safety

Read [.vela/specs/README.md](.vela/specs/README.md). All modules use the Universal Core plus an explicit domain profile. Source comparison, mathematical checks, question-first rendering and publication are separate gates. Never present historical tutorial rules as current institutional policy. Preserve notes and progress IDs when revising lessons.

Do not cache authenticated responses or learner records. Keep study/quiz page authentication dynamic, and cache published data separately. Public content revalidates after 60 seconds; the first request can serve the prior version while refreshing after CLI publication. Source access remains authenticated even when catalog descriptions are cached.

## Background workers

Do not kill all Node/Python processes, migrate unnecessarily, or regenerate the original binary Prisma client while OCR runs. Build uses only the separate app client. Monitor each module with its own status command and checkpoint files. Never commit private environment files, source PDFs or model downloads.


## Student experience and publication boundaries

Keep enrollment checks outside caches. Search caches only published, visible teaching/questions per module; hidden answer blocks fail closed and are never indexed as excerpts. Bookmarks are personal selections with validated source ownership; rendering them must never evaluate user markup. Resume writes use server arrival timestamps so a late request cannot overwrite a newer position.

Staff permissions come from qualification memberships, never editable profile roles or client hints. Use temporary identities/scopes in tests and remove bookmarks, positions, profile/memberships, enrollments and learner records before deleting test auth accounts.

Unmatched URLs use an explicit catch-all page that calls Next's `notFound()`, so the root App Router boundary handles them consistently. Segment not-found remains available for missing records; `global-error.tsx` is independent of the normal root layout. Test both actual 404 status and custom content, not only route existence.

The service worker caches only `/offline.html` and the public icon. Never expand it to cache authenticated pages/APIs without a separate privacy, device-sharing and conflict-resolution design.

## Required development context

Start at [.vela/README.md](.vela/README.md) for architecture, contributor restrictions, capability profiles, scaffolding policy and feature status. Preserve published content-policy hashes; runtime changes have separate policy versions. Subject tools must be gated in server prompts and browser rendering. Keep source workers running; additive schema migrations must not overwrite source or learner records. Verify private behavior with disposable scoped fixtures, never real peer discussion posts.

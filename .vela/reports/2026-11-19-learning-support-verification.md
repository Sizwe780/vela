# Learning support verification — 19 November 2026

This report covers the module-capability, scaffolding, outcome-evidence and opt-in collaboration tranche. It is not a full production certification or a new source-content audit.

## Completed checks

- `npm run typecheck`: passed.
- `npm run validate`: Prisma schema valid.
- `npm run format:check`: all matched files use Prettier style.
- `npm test`: 149 passed, 0 failed.
- `npm run build`: optimized Next.js 16 production build passed.
- `social-learning.spec.ts`: desktop and mobile passed against the production server and actual Neon PostgreSQL/Realtime. Two isolated learner accounts demonstrated live room counts, clock alignment, lease expiry, enrollment withdrawal, revision-bound paragraph discussion badges, replies, report deduplication, scoped moderation, private evidence histories and explained recommendations. Ordinary discussion refreshes were blocked while checking a socket-driven badge. Test posts/grades were limited to disposable QA modules.
- `math-practice.spec.ts`, `sandboxes.spec.ts`, `workspace-integrity.spec.ts`: 8 desktop/mobile checks passed, including real MAT1503/MAT1512 lessons, specialist tool visibility, bounded CAS, exact visual parameters, hidden answers, one reader toolbar and unclipped companion layout.
- `tutor-scaffolding.spec.ts`: 2 desktop/mobile checks passed. Mock transport proved strategy/tier/session fields and gated parallel answers. Actual server requests rejected unsupported maths-module debate and sample-only hints. Desktop live Cloudflare requests verified all three hints over a real MAT1503 session and a concise debate over an isolated conceptual lesson; no mastery rows were written.

The evidence artifacts/logs are under the workspace `work/` directory. Do not publish raw Playwright traces: they can contain disposable credentials, cookies or sealed query tokens. This sanitized report contains no credentials or learner identifiers.

## Observed failures and remedies

- Neon rejected live SQL depending on CURRENT_TIMESTAMP. Room live queries now use a server-issued timestamp parameter, resealed on the 25-second heartbeat. Expiry counts can lag until that refresh; ordinary joins/leaves and enrollment changes remain socket-driven.
- Prompt-only Tier 3 generated a different equation with the same answer as the learner's task. Guided replies now use typed drafts, server-owned exercise gates, private result comparisons and a bounded redraft. An actual subsequent Cloudflare result used `3x + 2 = 11`, correctly yielding 3, while withholding the original task's result.
- Initial debate output was too long and asked multiple questions. Checked drafts now enforce bounded fields and a single question; the live follow-up was a concise hypothetical challenge about identical versus needs-based feedback.
- Model math used backslash-parenthesis delimiters and inline display delimiters. Guided replies and companion rendering normalize the supported math syntax; checked drafts also run KaTeX syntax validation.
- Concurrent Playwright invocations deleted each other's trace artifacts. Verification now runs sequentially or uses distinct output directories. The isolated social reruns passed.
- The native Prisma migration engine failed in this Windows environment. The existing reviewed transactional runner applied `20261118150000_social_learning` and verified Prisma migration history/checksums. No source reset or blanket process restart was used.

## Limits and follow-up

- Private result comparisons catch equal normalized/numeric results and explicit assignment leakage; they do not prove arbitrary symbolic equivalence, conceptual independence or mathematical correctness. A model can misidentify its own result. Subject review and broader adversarial evaluations remain necessary.
- Live AI observations in this tranche use Cloudflare. Ollama shares the provider-aware guided path but has not been newly live-evaluated for these hints/debates.
- Conceptual debate was verified using a clearly isolated synthetic lesson, not a claim that BPT1501 has published production teaching. BPT1501's profile enables PCK/debate for future authored units.
- Presence and discussions are opt-in. Participation, hints, debate and answer reveals never award assessed mastery. Quiz evidence, AI conceptual estimates and the legacy mixed aggregate are displayed separately.
- Full moderation action reasons/audit, appeals, archival browsing, distributed inference budgets, subscription tenancy, offline synchronization and manual assistive-technology/physical-device evaluation remain separate work.
- Source conversion workers and real learner records were not reset or republished. Existing conversion totals in the status guide remain audit snapshots from the earlier source work.

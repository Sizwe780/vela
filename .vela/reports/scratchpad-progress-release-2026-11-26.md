# Scratchpad and progress release — 26 November 2026

The insights endpoint now applies the shared published-unit filter to outcomes, sessions, completion and assessment evidence. Retired BPT orientation content remains excluded consistently. A disposable learner enrolled in MAT1503, MAT1512 and BPT1501 returned the same 113 milestones and 23 outcomes across progress, mastery and recommendations on desktop and mobile; these totals are calculated, not hardcoded.

The starting editor mounts only when its disclosure is opened. MathLive fields no longer duplicate scratchpad previews. Matrix drafts start from the accepted matrix while preserving nonempty notebook drafts. Scalar controls offer fraction/power shortcuts. Counterexample readouts strip trailing zeros; symbolic differences require an explicit reveal. The checker provides targeted feedback when a finite starting limit is replaced with a variable expression.

The masterclass audit now permits registered lesson figures while rejecting placeholders and unregistered images. The local-provider stream test explicitly requests Ollama instead of depending on the default fallback provider.

Verification before deployment:

- Full automated suite: 193 passed, zero failed.
- Production build: passed compilation, TypeScript, static generation and standalone tracing.
- Desktop/mobile scratchpad and progress browser checks: 2 passed.
- Build preparation removes old standalone output before tracing; packaging skips generated deployment trees without traversing them and excludes environment files.

## Production acceptance

Direct Azure deployment completed without GitHub workflows: `c090aed3-330b-46c3-b2ee-4160fe56951a`, status `RuntimeSuccessful`, one successful instance and zero failed instances. The public home page returns HTTP 200 and `/deployment-version.json` matches the freshly built application.

The same browser checks passed on velastudy.app: **2 passed (1.2m)**, covering desktop and mobile. Both reported 113 milestones and 23 outcomes for the disposable test learner. Checks included the hidden starting editor, 4/10 readouts without trailing zeros, counterexample-first feedback, the explicit difference reveal, dropped-limit guidance, prefilled matrices, restricted scalar shortcuts and absence of horizontal page overflow. Production screenshots were inspected at both sizes. Disposable learner records were cleaned up.

Evidence: `work/audit-regression.log`, `work/azure-build-current.log`, `work/azure-polish-deploy.log`, and `work/scratchpad-polish-production/` in the parent workspace. No curriculum or learner migration was needed for this application release.

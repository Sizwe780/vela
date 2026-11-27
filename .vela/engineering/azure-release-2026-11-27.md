# Azure release — 27 November 2026

Direct ZIP deployment to `vela-web-app`, without GitHub workflows. Live build: `03iejDUhwCNa2rS0ZsDN8`. Corrected deployment: `f85af3c1-618a-4684-8dea-8f8733a0ac59`; Azure reports RuntimeSuccessful, one successful instance and zero failed instances.

## Incident and repair

The first package contained 55 old Next.js runtime route-cache files. They overrode current prerendered HTML despite the new build ID and correct HTML seeds. The problem reproduced with the same standalone package locally, ruling out a Cloudflare HTML cache as the cause. No evidence justified deleting the Oryx dependency archive: its timestamp and inspected Next.js files matched the current deployment.

Packaging now excludes runtime route caches and rejects a package containing them. Build preparation clears only the verified production route-cache path, preserving the separate development directory. The corrected artifact retains fresh build seeds, contains no environment files and serves the current legal/auth pages. Do not certify a release using only the public build ID; check actual rendered content after runtime readiness.

The production database was reachable and contained 23 modules, 50 units, 193 sessions and 5,866 content chunks at inspection. No content reseed, source replacement or learner-record purge was performed. The additive retention migration is verified. The existing verified scoped administrator is configured for support access, without granting new roles. Retention cleanup remains unscheduled; a preview did not delete anything.

## Verification

- Production build and TypeScript completed successfully; Prisma schema validation passed.
- 216 unit tests passed. Changed TypeScript/JSX/CSS formatting and credential-pattern checks passed.
- Four production browser checks passed across desktop and 360px mobile: public document layout, enrolled dashboard/navigation, matrix dragging, cofactor interaction, real unit quiz scoring and saved progress.
- A separate production lesson test passed for PHY1505, CHE1501, MAT1503, MAT1512, BPT1501, TPS2601 and PHY1503, checking actual session routes, gated answers and absence of KaTeX errors.
- Public About, Privacy and Terms return the new document frame. The personal Gmail and inactive domain mailto links are absent from the tested policy responses.

Evidence remains private in `work/site-audit-azure-build.log`, `work/azure-release-unit.log`, `work/site-audit-azure-cache-fix-deploy.log`, `work/site-audit-live-cache-fixed.log` and `work/site-audit-live-lessons.log`. Failed pre-repair browser traces are retained as diagnostic evidence, not counted as successful tests. Test accounts are disposable; real learner accounts and evidence were not reset. Browser traces may contain temporary authentication material and must not be published.

## Remaining boundaries

These targeted checks are not an exhaustive certification of all content, accessibility, grading, physical-device behavior or AI providers. Fixed banks contain two starter questions per unit, not full exam coverage. Domain inbox activation, scheduled retention enforcement, provider backup/log arrangements and qualified legal review remain separate rollout tasks. Remaining product audit fixes continue in the next development session.

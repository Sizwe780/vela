# Vela development system

This directory records product rules, architecture and verification expectations for contributors. It is not a chronological activity log. Start here before adding a learning feature.

Production operations: [direct Azure release runbook](engineering/azure-release.md) and [26 November release verification](reports/production-release-2026-11-26.md).

## Read in this order

1. [Architecture and boundaries](engineering/architecture.md).
2. [Development restrictions and delivery workflow](engineering/development-guidelines.md), then [code entry points and onboarding](engineering/onboarding.md).
3. [Module-specific support](specs/module-support-spec.md) and [capability registry](module-capabilities.json).
4. [Tutor scaffolding and debate](specs/tutor-scaffolding-spec.md), then [adaptive learning and Academic Master](specs/adaptive-learning-spec.md).
5. [Implementation status and open work](engineering/feature-status.md).
6. [Content specification onboarding](specs/README.md), then the universal core and selected domain extensions.
7. [Science source-to-lesson workflow](engineering/science-ingestion.md) before converting chemistry or physics material.
8. [Content factory timeline and runbook](engineering/content-factory.md) before generating or staging a module package.
9. [UNISA 90104–PSM first-level catalogue and module onboarding](modules/UNISA/90104-PSM.md).
10. [Module release checklist](engineering/module-release-checklist.md) for the handoff from authoring to staging. For school placement, read the [TPS2601 module crosswalk](modules/UNISA/TPS2601.md).

CHE1501 has a [preliminary historical guide review](reports/CHE1501-guide-2018-review.md). The exam scope excludes U7, U9 and U10. Confirm the current reading and assessment details before updating source page mappings.

The four core content specifications and `specs/manifest.json` govern authored lesson publication. Their recorded version/hash belongs to each publication. Do not silently change core policy or relabel existing units as complying with a new version. Runtime/engineering specifications have their own versions; adding a runtime tool does not rewrite textbook evidence, invalidate every published lesson or award new mastery.

Current product direction: universal learning infrastructure plus explicit, pluggable subject support. Mathematics is the first developed domain. Pedagogy, ethics and other conceptual subjects need tools for examining claims, assumptions, counterarguments and context. They must not inherit a mathematical interface simply because the platform started with mathematics. The user's proposed conceptual-subject extension is Socratic debate; future subject examples should extend this model rather than force all modules into one template.

Use the checked-in code and completed test reports as evidence of implementation. A policy, a mock response, a source-conversion count or a screenshot alone is not proof of end-to-end functionality. The project-level setup/API guides remain in the application root; link to them rather than duplicating credentials or operating history here.

Latest completed runtime checks: [19 November learning-support verification](reports/2026-11-19-learning-support-verification.md).

Academic Master release: [19 November adaptive-learning verification and AI limits](reports/2026-11-19-academic-master-verification.md).

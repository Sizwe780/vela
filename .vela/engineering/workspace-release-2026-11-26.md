# Workspace release — 26 November 2026

Runtime source: f105ec2. Direct Azure ZIP deployment; no GitHub workflows. Public build: CypTpAa53DEVrnnACgBvF. Azure reports RuntimeSuccessful, one successful instance and zero failed instances. The production public build identifier matches the local production build.

Live checks on velastudy.app used disposable learners and the production auth/database configuration. The fixtures were removed by the tests. Existing learner accounts and lesson content were not modified.

- Reading-first test passed on desktop (1440px) and mobile (360px). Verified Display/font controls, centered reading, guided pacing, pendulum readings/fit, wrong-unit retry and checked value, hint-triggered Companion, draft retention, notes autosave, source drawer, bookmark, real recall retrieval/reveal/rating, encrypted lesson download, wrong passphrase rejection and disconnected reload with the pendulum lab. Confirmed no API/study HTML in the service-worker cache.
- Real lesson checks passed for PHY1505, CHE1501, MAT1503, MAT1512, BPT1501, TPS2601 and PHY1503, including gated answers and absence of KaTeX errors. Legacy selectors were updated to target the session heading and wait for the paced lesson before revealing answers.
- Cloudflare, Groq and Gemini returned the expected numerical values and active-session citations on desktop and mobile. OpenRouter passed desktop, returned citations with empty answer text on one mobile request, then passed the isolated mobile retry. Treat this as an observed intermittent upstream response, not a clean reliability certification.
- Production build, Prisma validation and 197 unit tests passed before deployment. Typecheck also passed after the test changes.

Evidence files in the local work directory: workspace-azure-deploy.log, workspace-live-browser.log, workspace-live-lessons-final.log, workspace-openrouter-retry.log and workspace-release-typecheck.log. Browser screenshots/traces are under the corresponding workspace-live-browser and workspace-live-lessons-final directories. Keep traces private: they may contain disposable authentication/session data.

Offline limits remain unchanged: explicit encrypted downloads support reading, gated local practice and the physics pendulum lab. AI, other simulations, source photographs and assessed progress require connectivity. Local practice feedback is separate from assessed mastery. These targeted checks do not constitute a full regression certification for every feature or physical mobile device.

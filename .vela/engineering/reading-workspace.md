# Reading-first workspace

The default is a centered reader. Display contains layout and text sizing. Lesson tools contains bookmarking, sharing, download and discussion controls. The compact timer remains optional. Companion opens on demand (including a hint or selected passage); closing it retains the current conversation. Selection only prepares a draft and never sends automatically. On phones it becomes a modal bottom sheet with a persistent Read/Companion/Recall action bar.

The section outline and optional Guided mode must preserve the complete lesson, answer gates, drafts and source context. Reading completion, local practice and assessed mastery remain distinct. Local numeric/choice checks use explicitly reviewed domain bindings; unknown questions receive an ungraded reasoning field. Never infer correctness by comparing arbitrary prose or award mastery from a reveal. Physics bindings live in content/physics, not generic renderer conditionals.

Labs use elevated studio surfaces; common mistakes use amber callouts. Pendulum animation follows the small-angle model, pauses offscreen, respects reduced motion and labels observations as simulations. Fit slope and gravity require three distinct observations. Steppers accompany sliders.

## Offline contract

Installation alone does not download private lessons. Students explicitly save an encrypted lesson using a separate download passphrase (AES-GCM, PBKDF2). Public reader assets are cached; authenticated pages and APIs are never cached by the service worker. No plaintext lesson titles/body are stored in IndexedDB. Downloaded copies remain on that device until removed, are not remotely revoked or automatically refreshed, and cannot be recovered without the passphrase.

Offline reading supports math/chemistry rendering, gated exercises, declared local checks and the pendulum lab for physics-capable packs. Other widgets, source photographs, AI, discussion and assessed progress require connectivity. Do not advertise full offline parity or synchronize local practice as verified mastery.

## Verification

Run typecheck, validate, unit tests and build. tests/browser/reading-first.spec.ts exercises a real PHY1503 session at desktop and 360px: display, guided pacing, simulated fit, units/retry, companion draft retention, notes autosave, source and bookmark actions, encrypted download, incorrect passphrase rejection and offline reload. Recall opening is mocked in that test; it does not certify live grading. Legacy browser tests that assume an always-visible companion or old toolbar locations must be updated when touched.

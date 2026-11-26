# Reading-first workspace

The default is a centered reader. Display contains layout and text sizing. Lesson tools contains bookmarking, sharing, download and discussion controls. The compact timer remains optional. Companion opens on demand (including a hint or selected passage); closing it retains the current conversation. Selection only prepares a draft and never sends automatically. On phones it becomes a modal bottom sheet with a persistent Read/Companion/Recall action bar.

The section outline and optional Guided mode must preserve the complete lesson, answer gates, drafts and source context. Reading completion, local practice and assessed mastery remain distinct. Local numeric/choice checks use explicitly reviewed domain bindings; unknown questions receive an ungraded reasoning field. Never infer correctness by comparing arbitrary prose or award mastery from a reveal. Physics bindings live in content/physics, not generic renderer conditionals.

Labs use elevated studio surfaces; common mistakes use amber callouts. Pendulum animation follows the small-angle model, pauses offscreen, respects reduced motion and labels observations as simulations. Fit slope and gravity require three distinct observations. Steppers accompany sliders.

## Offline contract

Installation alone does not download private lessons. Students explicitly save an encrypted lesson using a separate download passphrase (AES-GCM, PBKDF2). Public reader assets are cached; authenticated pages and APIs are never cached by the service worker. No plaintext lesson titles/body are stored in IndexedDB. Downloaded copies remain on that device until removed, are not remotely revoked or automatically refreshed, and cannot be recovered without the passphrase.

Offline reading supports math/chemistry rendering, gated exercises, declared local checks and the pendulum lab for physics-capable packs. Other widgets, source photographs, AI, discussion and assessed progress require connectivity. Do not advertise full offline parity or synchronize local practice as verified mastery.

## Verification

Run typecheck, validate, unit tests and build. tests/browser/reading-first.spec.ts exercises a real PHY1503 session at desktop and 360px: display, guided pacing, simulated fit, units/retry, companion draft retention, notes autosave, source and bookmark actions, encrypted download, incorrect passphrase rejection and offline reload. Recall opening is mocked in that test; it does not certify live grading. Legacy browser tests that assume an always-visible companion or old toolbar locations must be updated when touched.

## Checking written practice across domains

Every published session exercise offers an attempt field and Check my attempt. Reviewed exact quantity/choice bindings remain local deterministic checks. Other responses use POST /api/practice/check for explicitly labelled formative AI feedback, grounded in the exact server-loaded exercise and worked solution. The client supplies an attempt and exercise identity, never an authoritative answer key, score or verdict. Enrollment is checked before and after review; owner mismatch, ambiguity, edited questions and changed revisions are rejected. Source quotes are validated internally and not returned as an answer-key field.

AI feedback uses correct/partial/incorrect/unverified estimates with one next step. It can be wrong; no StudentMastery, ConceptCheck, BKT or institutional grade is written. A practice reviewed by AI is counted separately from a deterministic local check. Low confidence or unsupported evidence yields needs review, never a correctness claim. Provider errors preserve the draft and allow retry. The existing coach request allowance applies. Answer reveals remain independent and gated. Requests are cancelled on exercise/account changes, with no storage of the submitted draft by this feature; configured model providers process the submitted answer when the learner presses Check my attempt.

Offline downloads retain exact local checks. Broader written feedback needs connectivity and a current authenticated enrolled session; it does not silently guess correctness offline. Generated chat examples and arbitrary legacy text without a registered session exercise cannot impersonate published exercises.

## Pacing controls

Normal and Deep transfer use keyboard-accessible segmented radio pills, with explicit server-side pacing instructions on each request. The selected pace is carried by the current request, not inferred from conversation history. Switching preserves drafts/history, stops stale spoken audio and clears old request errors; controls are disabled while streaming. Check my understanding respects the selected pace. Deep transfer uses validated structured drafts with one focused question per turn; Normal uses the standard answer stream with direct, proportionate explanations. Explicit hint tiers and debate still take precedence for their turn. A synthetic live model probe is distinct from a full real-lesson RAG certification.

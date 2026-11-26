# Practice feedback and tutor pacing verification

## Feature contract

Published lesson exercises share Check my attempt. Reviewed quantity/choice bindings remain deterministic and local. Broader responses receive explicitly labelled AI estimates against the server-loaded exercise and worked reference. Unknown, low-confidence or malformed mathematical feedback remains unverified; provider errors preserve the attempt. This feature writes no grade, assessed mastery or BKT state. Canonical source, account, enrollment and revision checks run on the server, including rechecks after review.

Normal/Deep transfer use accessible radio pills with keyboard controls. Switching preserves conversation/drafts and stops stale audio. Check my understanding honours the choice. Normal uses the standard answer stream with explicit direct-answer instructions. Deep uses validated structured drafts with one question per turn; explicit hint/debate rules still take precedence.

## Observed checks — 26 November 2026

- Full unit suite: 204 passing, run with test concurrency 2 to avoid overloading the bounded CAS worker during local development. The initial unrestricted run while the dev server was compiling hit the existing five-second worker deadline; it passed with bounded concurrency.
- Practice UI: desktop and 360px mobile checks passed across MAT1503, MAT1512, CHE1501, BPT1501, TPS2601, PHY1505 and PHY1503. Feedback transport was mocked for the final UI run. Verified input, review display, answer gates and clearing stale feedback on edit.
- Earlier live desktop formative checks returned correct estimates for six reference submissions; the calculus reference submission was left unverified. A deliberately nonsensical maths attempt was not accepted. This is a transport/behavior sample, not validation of general grading accuracy.
- Tutor pacing UI: desktop and mobile checks passed for draft retention, radio/keyboard selection, no dropdown, same-line controls, request pacing, switching back to Normal after a Deep turn and the understanding shortcut. Chat streams were mocked.
- Safe live mode probes used entirely invented counter examples with no database, textbook or learner content. Deep asked one question without stating the total; the actual standard tutor streaming model answered the total directly after synthetic Deep history.
- An extra full-stored-solution diagnostic was rejected by automatic approval review for external content egress and was not executed. The interrupted live test was stopped and its recovered disposable fixture cleaned. Do not enable VELA_LIVE_PRACTICE reference-submission tests without authorization for that source/destination.

Local evidence: practice-pacing-all-tests.log, practice-review-unit-final.log, practice-universal-ui-final/, tutor-pacing-browser/, tutor-pacing-synthetic-live.log, tutor-pacing-normal-stream-live.log and practice-fixture-cleanup.log under the task work directory. Keep auth traces private. These checks are not a full regression certification, physical-device audit or proof of AI grading accuracy.

## Runtime boundaries

No migration or content reseed is required. Broader written feedback needs an online authenticated lesson and an available configured AI provider; the existing coach request allowance applies. Offline packs retain reviewed local checks, with broader feedback unavailable. Generated chat exercises and arbitrary legacy text cannot supply their own authoritative answer key through this endpoint. Application changes require the normal production build and direct Azure deployment; a Git commit alone does not update Azure.

Final checks: schema validation, TypeScript and the production build passed. Four targeted desktop/mobile browser cases passed (practice UI and pacing UI). The 204-test suite passed with bounded concurrency. Azure was not redeployed in this change.

# Focused study activity

Focused time starts automatically whenever an authenticated learner opens a real enrolled lesson. No Start click or profile opt-in is required. A learner can still pause manually for the current lesson. Opening another lesson starts its timer automatically. The public demo does not record study time.

After exactly 10 seconds without mouse movement, touch, scrolling, keyboard or answer-input activity, the timer pauses. Any of those interactions resumes an idle timer automatically. Hidden and unfocused pages pause immediately. A precise idle deadline supplements the one-second display tick, so the visible status does not wait for a network heartbeat to pause. Only recent activity is used locally; coordinates, keys and answer contents are never included in timer requests. Heartbeats are sent every 5 seconds while active; pointer movement does not issue a request per movement. Reconnection retries a failed connection only when the lesson is still active.

One active lease per learner prevents multiple tabs/devices from counting overlapping intervals. A conflicting tab shows **Track in this tab** so the learner can deliberately move the lease. Old-tab heartbeats and delayed stop requests cannot remove the new tab's lease. The lease expires after 15 seconds without a heartbeat. Pausing or navigating away attempts a final bounded stop request; a lost unload request may lose the last few seconds rather than invent time.

The server calculates elapsed time rather than accepting durations or dates from the browser. Each heartbeat can add at most 10 seconds; expired or backward intervals add nothing. Recording rechecks enrollment under the same module lock used for withdrawal. No timer action creates `StudentMastery`, awards a session milestone or changes institutional marks.

## Your activity page

`/activity` is private to the signed-in learner. The home dashboard links to it and shows the same weekly-goal progress. Change the weekly goal on `/profile`.

- Weeks run Monday–Sunday in South African time. Daily credit is split correctly across midnight.
- Daily bars and module totals show recorded seconds rounded down to whole minutes in the UI; short intervals display “less than 1 min.”
- A streak requires at least one recorded minute in a day, across up to 90 days. An unfinished current day does not erase yesterday's streak.
- The goal progress bar caps at 100%, while actual time remains visible if it exceeds the goal.
- Previously recorded time stays private to its learner after withdrawal. Withdrawal prevents new recording and real course access; it does not erase personal history.
- These activity metrics are separate from completion and assessed mastery. Time is not evidence that a concept was understood.

## Storage and access

The additive `20261118100000_study_activity` migration adds `StudyActivityDay` (learner/day/module counters) and `StudyPresence` (one active lease per learner). No source content or conversion state is changed. Module IDs, rather than module codes, keep reused and institution-specific modules distinct. The existing trusted PostgreSQL migration fallback is used on this Windows environment if its native Prisma engine is unavailable.

`GET /api/activity` returns this learner's weekly summary and module totals with private/no-store headers. `POST /api/activity` accepts only `{sessionId,trackingId,action:"start"|"pulse"|"stop",takeover?}`; identity, recording dates and durations are rejected. The session must belong to an active/completed enrollment. Credits and lease changes are transactional, with a per-learner lock and a rechecked enrollment decision. A stale stop from another tab is harmless.

No paid provider, external tracking script, AI call or new background worker is needed. The current reporting calendar is explicitly South African; timezone preferences and deeper learning-outcome trends remain future extensions. Existing privacy/retention review requirements still apply to the production platform.

The legacy `autoStartTimer` profile field is retained for API/database compatibility and is no longer a runtime switch. The profile explains the automatic policy rather than offering a misleading opt-in. The live counter estimates the current open lesson; daily/module totals use server-owned elapsed time. No client duration, event payload or date is accepted as credit.

Leaving/reloading a page sends a keepalive stop. Back-forward-cache suspension freezes the local clock until the page is shown and focused again; late responses cannot restart a hidden page. A short departing-tab lease conflict is retried every five seconds while the new lesson is active, without taking over another live device. Tracking IDs are separate per browser realm and account, and remain stable across same-account lesson navigation.

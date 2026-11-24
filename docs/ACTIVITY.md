# Focused study activity

Open a real enrolled learning session and select **Start study timer**. The control sits beside the single session bookmark toolbar. Recording is off until you choose to start; it stays enabled across in-unit session navigation, and pauses on reload or when leaving the workspace. No study time is recorded for the public demo.

The timer pauses when the page is hidden, unfocused or has had no keyboard, pointer, touch or wheel interaction for two minutes. Only the fact of recent interaction is used locally; event contents, coordinates and typed keys are never sent. Heartbeats are sent every 15 seconds. Hidden/background time and long disconnected gaps are not backfilled. This can undercount quiet reading or listening; it is an activity estimate, not verified attention, attendance or learning.

One active lease per learner prevents multiple tabs/devices from counting overlapping intervals. A conflicting tab shows **Track in this tab** so the learner can deliberately move the lease. Old-tab heartbeats and delayed stop requests cannot remove the new tab's lease. The lease expires after 45 seconds without a heartbeat. Pausing or navigating away attempts a final bounded stop request; a lost unload request may lose the last few seconds rather than invent time.

The server calculates elapsed time rather than accepting durations or dates from the browser. Each heartbeat can add at most 20 seconds; expired or backward intervals add nothing. Recording rechecks enrollment under the same module lock used for withdrawal. No timer action creates `StudentMastery`, awards a session milestone or changes institutional marks.

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

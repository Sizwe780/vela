# Welcome and active recall email

## Current connection

Resend Free is configured in **test mode**, using `onboarding@resend.dev`. The approved test inbox is `sizwen.ngwenya08@gmail.com`; the operator confirmed receipt of both welcome and recall previews. Reply-to remains the support address. The previews do not subscribe anyone, change an account email or alter mastery. Their review counts are explicitly sample data.

Brevo support is implemented but activation was blocked by its phone verification. No phone verification was bypassed and no paid plan was selected. Resend's shared sender is restricted to the account owner's inbox. It is **not** a production student mailing service until a sending domain is verified. Auth OTP delivery remains managed separately by Neon.

Official references: [Resend pricing](https://resend.com/pricing), [sending email](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Brevo free limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [Brevo API](https://developers.brevo.com/reference/send-transac-email).

## Configure privately

Put credentials in the ignored `.env`, never in client variables or chat. The app and CLI use the same settings; restart both after a change.

```dotenv
EMAIL_PROVIDER="resend"
EMAIL_MODE="test"
RESEND_API_KEY="your-sending-access-key"
EMAIL_FROM="onboarding@resend.dev"
EMAIL_REPLY_TO="sizwe.ngwenya78@gmail.com"
EMAIL_TEST_RECIPIENT="sizwen.ngwenya08@gmail.com"
EMAIL_APP_URL="http://localhost:3200"
EMAIL_DAILY_LIMIT="85"
EMAIL_UNSUBSCRIBE_SECRET="independent-random-secret-at-least-32-characters"
EMAIL_JOB_SECRET="another-independent-random-secret-at-least-32-characters"
```

Secrets were generated locally. `EMAIL_MODE=disabled`, missing settings, invalid origins or invalid limits disable sending. Test mode has a transport-level recipient allowlist. Live mode requires HTTPS and forbids a Resend shared sandbox sender.

Resend: default 85 attempts/day, hard maximum 90 (at most 2,790 across a 31-day month, below the published 3,000/month and 100/day free limits). Brevo: default 250, hard maximum 280, below 300/day. Counts include operator tests and rejected attempts. Other applications using the same provider account consume quota outside this app's ledger; keep allowance for them.

## Run and monitor

From `outputs`:

```powershell
npm run email:worker   # every minute; leave running alongside the app
npm run email:status   # mode, provider, budget and outbox counts; no addresses or keys
npm run email:once     # one bounded batch; useful for a scheduler
npm run email:test -- --preview=welcome
npm run email:test -- --preview=recall
```

The operator CLI sends previews only to `EMAIL_TEST_RECIPIENT`; this address need not be a learner. Each preview type is deduplicated per inbox/day. The signed-in profile's delivery-test button is stricter: its verified account email must match the configured test inbox.

**Local scheduling runs only while the laptop and worker are on.** Checkpoints/outbox survive shutdown; pending work resumes on the next run. Recall dispatch is limited to 09:00–18:00 SAST; outdated daily digests expire. CLI counters report provider acceptance, not proof of inbox placement. Provider dashboards show subsequent delivery/bounce status.

The background worker started in this development session writes `../work/email-worker.log`. From `outputs`, use `Get-Content ../work/email-worker.log -Tail 10 -Wait` to watch its minute-by-minute checks. `email:status` is an outbox summary, not proof that a worker is running. Historical failed attempts remain visible: the initial incorrect test inbox was rejected by Resend before the two successful previews to the corrected inbox.

## Learner workflow

1. Sign up, verify your Vela email, and enroll in modules. A single welcome is queued after enrollment or a verified app visit; the worker sends only to a currently verified address.
2. On `/profile`, select **Email me active recall reminders** and save. Consent time and version are recorded. No existing student is opted in automatically.
3. Practice and rate active recall. Actual `StudentMastery.nextReviewAt` values drive reminders for active/completed enrollments. Unpractised outcomes without a due date do not trigger email.
4. At most one reminder per learner per SAST day is queued, including unsubscribe/re-subscribe cycles. Dispatch rechecks verification, current enrollment, due work and current consent. Clearing the queue or withdrawing suppresses irrelevant reminders.
5. Disable the preference or use the email unsubscribe link. A GET only shows confirmation, so link scanners cannot unsubscribe. Signed POST supports one-click unsubscribe without login. Links are bound to a consent generation; an old link cannot cancel a later re-subscription.

In the current sandbox, a Vela account using `sizwen.ngwenya08@gmail.com` must be verified to enable actual reminder tests. The existing operator account's different email is unchanged. Welcome and recall previews confirmed delivery, not a reminder opt-in or a scheduled learner digest.

Emails contain no notes, source content, quiz answers, transcripts or individual scores. The durable outbox stores subject identifiers, purpose, consent generation, provider receipt and delivery state rather than email bodies/recipient addresses. The current verified address is resolved at dispatch from Neon Auth.

## Public deployment and free scheduling

When a Vela HTTPS deployment exists, `scripts/email-scheduler/` supplies a small Cloudflare Cron Trigger. Set `VELA_ORIGIN` and `EMAIL_JOB_SECRET` as Worker secrets, then deploy with Wrangler. It invokes `POST /api/jobs/email` with a bearer secret; it needs no database access. The example runs every five minutes, with the app enforcing send windows and budgets. This trigger is **not deployed for localhost**, which Cloudflare cannot reach.

Before live delivery, verify a sender domain in Resend, set `EMAIL_FROM` to it, set `EMAIL_APP_URL` to the real origin, and choose `EMAIL_MODE=live`. Alternatively, finish Brevo's phone/sender verification and choose `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, a verified `EMAIL_FROM`, and the matching daily cap. Keep learner consent opt-in. Review sender/domain authentication, provider terms, production privacy/retention and bounce/complaint handling before public rollout.

## Reliability and recovery

An additive `20261118090000_email_delivery` migration adds the outbox, shared budget and consent fields. The existing reviewed PostgreSQL fallback applies it if the Windows native Prisma engine fails. Existing disabled preferences remain disabled. No content conversion tables are changed.

Transactional claims and a shared advisory lock prevent concurrent workers from taking the same job or exceeding the budget. Provider idempotency keys use the stable job UUID. Explicit rate limits are deferred with bounded retries. Network/5xx/unknown outcomes and interrupted sends become `uncertain`, with no blind resend after the provider's idempotency window. Inspect the provider receipt/logs before manually reconciling uncertain jobs. `sent` means accepted by the provider, not delivered/read. Automated bounce/complaint webhook reconciliation awaits a public HTTPS endpoint.

`npm run email:test -- --retry-rejected` retries only an explicitly rejected operator test, not uncertain or accepted messages. Correct the configuration first. Do not delete outbox records to force a resend.

## Verification — 18 November 2026

- Production build, TypeScript, Prisma validation and formatting checks passed; all 109 unit tests passed.
- Both welcome and recall previews were accepted by Resend and confirmed received by the operator in the approved inbox.
- The protected email job returned HTTP 200 and a test-mode batch result; unauthorized requests return 401.
- Six desktop/mobile browser checks passed across the full run and the focused mobile rerun. The initial mobile regression timeout was a test setup race: OTP interception was installed after profile navigation, leaving an in-flight session request paused. Installing mocks before navigation resolved it without increasing the timeout. The two timed-out disposable account fixtures were cleaned up.
- The local worker is running, reporting minute-by-minute checks. Actual reminder consent remains opt-in; previews did not subscribe the operator or modify learner progress.

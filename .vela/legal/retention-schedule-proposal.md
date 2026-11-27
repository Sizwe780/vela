# Approved retention targets
Prepared 27 November 2026. **Targets approved by the operator on 27 November 2026; production scheduling and provider settings remain pending.** This is an operational proposal for Vela Learning (Pty) Ltd, not a legal opinion. Public copy must distinguish approved targets from deployed enforcement and must not promise an unverified provider backup deadline.

Information Officer contact supplied by the operator: Sizwe Ngwenya. Contact address: 12449 Tsipinoto Street, Benoni, 1520. Registration/appointment evidence must be kept separately. The domain mailboxes are not yet working; the public contact form stores private support requests and sends no automatic email.

| Record | Proposed retention / action | Implementation required |
| --- | --- | --- |
| Account, enrollment, notes, saved work, study position and practice evidence | While the account is active. Review after 24 months of inactivity; notify 30 days before closure. On a verified deletion request, remove eligible live records within 30 calendar days; identify and explain any lawful hold. | No automatic inactivity purge exists. A qualified person must verify which institution records require retention; do not erase grades or portfolios blindly. Notify only through a working, authorised channel. |
| User-deleted notes and saved items | Remove from live account storage when the delete action succeeds. | Verify cascading references and device copies separately. |
| Guest and account-support requests | 12 months after resolution, then delete contact/message content unless a documented continuing purpose applies. | Add reviewed, dry-run-first cleanup and an audit receipt without message content. |
| Delivery troubleshooting records | 90 days; retain only minimal consent/withdrawal evidence needed to administer the preference and justify messages. | Review provider-side logs separately. Suppression must continue to prevent unwanted messages. |
| Moderation cases and associated evidence | 12 months after closure, subject to a documented appeal/safety/legal hold. Removed post bodies remain redacted. | Confirm how replies and identifiers are treated on account deletion; do not promise that removal deletes every historical record. |
| Room-presence and timer leases | Visibility expires under existing lease rules. Purge expired lease rows within 24 hours. | Expiry of visibility is already implemented; a recurring physical-row cleanup still needs deployment. |
| Operational security/error logs | 90-day target, reduced where troubleshooting does not require it. Never log passwords, session tokens, raw photos or recordings. | Verify Azure/Cloudflare log settings and access controls. |
| Authentication sessions | Use the configured provider expiry and revoke on the applicable sign-out/device action. | Record the actual Neon configuration; do not assert a default TTL without checking it. |
| Photos and recordings submitted to optional AI tools | No database persistence by Vela for the raw media; process for the requested feature. | Verify each enabled provider’s contractual retention, training settings and regional processing. |
| Managed database backups | Expire under a verified provider schedule; document when a deleted record stops being recoverable. | Record the actual Neon plan/window and restore procedure. A restore must reapply deletion/suppression decisions. No unverified backup-erasure deadline is proposed as a promise. |
| Offline downloads | Until the learner removes the device copy or clears its storage. | Server deletion cannot remotely erase an already-downloaded copy. Explain this separately from live-account deletion. |

Approval should record the operator, date, version, purpose for any exception, provider backup window and legal-review outcome. Scheduled jobs must default to a count-only preview, scope each category explicitly and preserve legal holds. Never run a broad cleanup against learner records as a development test.

References: [POPIA, especially sections 14, 18, 55 and 72](https://www.dffe.gov.za/sites/default/files/legislations/popia04of2013_vol581no37067.pdf), [Information Regulator contact and complaints](https://inforegulator.org.za/contact-us/).

## Implementation record

Operator approved these targets in this chat on 27 November 2026. Policy version: `2026-11-27-v1`. The additive hold/audit migration is applied and verified on the configured production database. The bounded maintenance runner defaults to preview; no production cleanup schedule is activated by this change. No real learner records were purged for testing.

Use `npm run retention:preview`. After reviewing counts and holds, an authorised operator may use `npm run retention:apply -- --host=<exact database host> --policy=2026-11-27-v1`. Run repeatedly if `mayHaveMore` is true. Deploy a daily operator-controlled schedule only after environment and provider review. Apply never closes inactive accounts or fulfils account deletion requests. Use the separately reviewed deletion runner for those requests. Welcome delivery keys are retained to prevent duplicate welcome messages while old diagnostic metadata is scrubbed.

The support inbox exposes preview counts, deletion deadlines, inactivity candidates and hold controls only to the configured verified support administrator. External log expiry, provider backups and inactivity notices require separate rollout.

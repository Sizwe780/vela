# Accounts, support and institution administration

## Learner account

Open **Profile** to verify or change your email, update your password, manage signed-in devices, download your data, or adjust your notification preferences. Password changes use the current password and revoke other sessions. Email confirmation and session revocation are handled by Neon Auth. If a password-reset link expires, you can request another from the sign-in page.

The Classroom assignment badge and active-recall emails are independent. Turning off the badge removes the navigation count. Your Classroom assignments and announcements remain available. Reminder emails still require verified email, consent, and an available sending provider.

Open **Help and support** to report an account, learning, accessibility, or technical issue. Your requests and replies are available in Help. People who cannot sign in can use the support address on the public Help page.

## Support operator

The support inbox is limited to the verified qualification administrator whose immutable Neon Auth subject is configured as `VELA_SUPPORT_OPERATOR_ID`. Scope is checked on the server. Learners can view and cancel only their own pending deletion request. Reports are rate-limited and the requester never supplies a subject ID.

Deletion is a reviewed workflow. A signed-in learner with a verified email types the confirmation phrase. Support marks the request **In review**, uses the reference to verify the subject and checks any applicable institutional retention obligations. The requester can first download a private JSON export. The export excludes credentials, session tokens and unreleased answer keys.

From the app root, with the database URL set to the reviewed branch, inspect the request:

```powershell
node --require ./scripts/windows-runtime.cjs --import tsx scripts/fulfill-account-deletion.ts --request=REQUEST_ID --host=EXACT_DATABASE_HOST --phase=review
```

The command blocks removal of the last qualification administrator or institution owner. Transfer that access first. Use the Neon console to remove the reviewed Auth subject on the same branch, then complete the application-data cleanup:

```powershell
node --require ./scripts/windows-runtime.cjs --import tsx scripts/fulfill-account-deletion.ts --request=REQUEST_ID --host=EXACT_DATABASE_HOST --phase=erase --apply
```

The cleanup checks that the Auth account is absent from that database before it erases private records. It retains published institutional material and peers’ discussion replies, anonymises retained attribution and redacts the departing learner’s post bodies. Backup retention and any institution-specific record obligations are managed outside the application.

## Institution workspace

Institution owners are provisioned by the platform operator against a verified Auth subject. Institution permission grants are independent of qualification staff memberships. A signed-in account can have neither, one, or both. Permissions are evaluated per institution.

| Permission | Scope |
| --- | --- |
| Curriculum | Create qualifications, add or reuse module codes, and archive or restore qualifications and module links |
| Directory | Find institution-linked users and update their enrolment status |
| Reporting | View and export qualification-level enrolment counts |
| Access | Inspect scoped permissions and audit history. Owners can grant or revoke individual permission combinations |
| Integrations | View provider configuration and control whether the institution offers a configured SSO provider |

New qualifications and module links start with self-enrolment closed. A qualification administrator can open eligible enrolments in the Teaching workspace. Archived qualifications and module links stay out of self-enrolment and block new invitations. Existing active or completed learners keep access. A module used in two qualifications can be archived in just one.

The directory is institution-scoped. Qualification learner and staff invitations are managed from the Teaching workspace. The reports count enrolments by status and include no learner names, email addresses or answers.

### SSO and provider setup

Configure Google Workspace or Microsoft Entra ID in Neon Auth on the appropriate branch with its approved OAuth credentials and redirect domains. Then set `VELA_SSO_PROVIDERS` to the configured provider names. An institution administrator can expose or turn off the corresponding sign-in option. This is an entry point for authentication. Successful sign-in alone grants no enrolment, course access or institution permissions. Tenant-specific SAML enforcement, SCIM, and rotation of AI or email credentials remain provider/operator work. The application displays integration configuration without returning credentials.

### Signed-in checks for the next pass

Use distinct browser contexts for the named staging administrator and an ordinary staging learner. Verify sidebar and direct-route boundaries, qualification and institution scope, learner-only classroom submissions and data exports, support ticket ownership, admin curriculum changes, password/session updates, email verification and provider-backed sign-in. Use only disposable identities for deletion. Email changes require access to the destination inbox.

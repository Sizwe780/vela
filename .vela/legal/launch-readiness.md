# Operator-only legal release checklist
27 November 2026. This checklist belongs in development/operator documentation, never verbatim in public policy copy.

Confirmed: operator-provided company name, Information Officer contact name and contact address; anonymous contact intake backed by the private SupportRequest inbox; configured support operator is an existing verified, scoped admin. Personal Gmail is no longer the public fallback. Dedicated domain mailboxes remain unverified and are not advertised as working.

Still to complete before treating the notice as a final onboarding/compliance deliverable:

- Confirm the Information Officer appointment/registration and the legal company/address particulars.
- Activate and test privacy@velastudy.app / support@velastudy.app. Only then set the public contact configuration and verification flag.
- Retention targets are approved. The preview-first runner and legal-hold controls are implemented and isolated cleanup tests pass. Deploy the reviewed schedule and confirm provider expiry/restoration separately; full account deletion remains an operator-reviewed process.
- Record actual Azure, Cloudflare, Neon and enabled AI/email processing locations, processor agreements, training/retention settings and the applicable section 72 transfer basis. Do not infer protection merely from a provider name or a local model selection.
- Obtain qualified review of final terms and notice. POLICIES_APPROVED is an operator configuration flag, not a compliance certificate.
- Review public-contact abuse protections before large-scale onboarding. The current same-origin endpoint has body limits, a honeypot and transactional daily quotas; it does not claim human verification or send account changes from unauthenticated requests.

The public notice describes the current manual request process with approved targets clearly distinguished from production scheduling and provider backup expiry. The revised legal pages use the public document header and a single Back to Vela link.

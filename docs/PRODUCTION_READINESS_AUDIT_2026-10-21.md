# Production readiness audit, 2026-10-21

Scope: the confirmed production issues for scheduled notifications, affiliate reconciliation,
translation, email and auth, Supabase migrations and security, forum performance, documentation,
CI and the live Render deployment.

No customer-row content, secrets or credentials were inspected or printed during this audit.

## Verified

| Area | Evidence | Result |
| --- | --- | --- |
| Scheduled notifications | GitHub Actions run `39514013295`; production endpoint step completed successfully | PASS |
| Affiliate reconciliation | GitHub Actions run `39514019041`; one-day production reconciliation completed successfully | PASS |
| Endpoint protection | Unauthenticated production requests to both cron endpoints return `401`, not the former configuration `503` | PASS |
| Draft translation contract | `draft-writer-v2` requires a complete target-language translation, preserves the authoritative German draft and refuses a false deterministic non-German translation | PASS in code and tests |
| Translation persistence | Generated drafts persist `translation` and `translation_locale` in `correspondence_drafts` | PASS in code and database contract |
| Per-document translation storage | Immutable versions are tied to the owned source document and exact source hash; authenticated users can read only their own rows and cannot write them directly | PASS in production schema, RLS and grants |
| SMTP transport | STARTTLS, certificate verification, refusal paths, message identity and attachment bytes are covered by the committed network test | PASS in CI |
| Auth routing | BG login, signup, recovery and MFA pages return `200`; anonymous BG and DE dashboard requests return localized `307` redirects to their login pages | PASS in production |
| Migration history | Supabase lists the repository migration sequence through `20261021003859_document_translation_fk_index` | PASS |
| Forum database performance | The performance advisor reports no unindexed foreign keys; the five forum covering indexes are present | PASS |
| Service-only RLS tables | Eight information notices remain, but the reviewed tables have RLS enabled and no `anon` or `authenticated` table grants | PASS; no policy change required |
| Repository checks | GitHub CI run `39514584737` completed successfully for documentation commit `8dc3aa5`; application commit `98a2550` passed in run `39513154895` | PASS |
| Render deployment | Deploy `dep-dbbvfdh5efls73c3q1vg` is live on commit `8dc3aa5`; health reports the same revision | PASS |
| Runtime errors | No application-error or HTTP 5xx log entries after the current deploy | PASS |

## Owner decisions still required

These are not safe code fixes and were not changed by this audit.

1. **Production outbound email provider.** The generic SMTP transport is complete, but a real
   provider and its credentials must be selected and configured before a production send can be
   verified. This requires explicit approval for production environment variables.
2. **Supabase leaked-password protection.** The advisor warning remains. The owner decided to keep
   the Free plan until the first 100 active users, then upgrade and enable the control.
3. **Authenticated non-German production translation.** The contract and persistence are tested,
   but a real production E2E needs an authenticated test case and an active AI provider. No customer
   case should be used for this check.

## Current conclusion

The safe code, database-history repair, forum indexes, cron authentication and deployment checks
are complete. Production is healthy at `8dc3aa5`. The three items above remain explicit owner or
test-fixture decisions and are not hidden behind a passing code check.

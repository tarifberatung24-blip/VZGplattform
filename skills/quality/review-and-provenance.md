# SOP-QUALITY-001 — Review and provenance

**Version:** 1.0.0
**Owner:** HORIZON Alpha Team
**Autonomy:** human-assisted
**Allowed operations:** `read_case`, `request_human_review`, `prepare_external_handoff`

## Procedure

1. Verify every material claim has a case, document or user-confirmation reference.
2. Check missing and unconfirmed facts before a draft can be approved.
3. Apply the existing `lib/horizon/agent/safety.ts` policy.
4. Apply the existing `lib/horizon/case/release.ts` approval/hash gate for any handoff preparation.
5. Block sending, signing, submission and authenticated third-party access.

## Refusal conditions

- missing provenance;
- stale or absent customer approval;
- unresolved critical facts;
- any autonomous external action.

## Output

Pass/fail review decision, blockers, provenance gaps and required human action.

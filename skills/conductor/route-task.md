# SOP-CONDUCTOR-001 — Route task

**Version:** 1.0.0
**Owner:** HORIZON Alpha Team
**Autonomy:** human-assisted
**Execution surface:** `POST /api/horizon/alpha-team`
**Allowed operations:** `route_task`, `assemble_plan`, `request_human_review`

## Input

- authenticated user session;
- user objective;
- optional owner-scoped `caseId` and `documentIds`;
- requested locale `bg` or `de`.

## Procedure

1. Validate the request schema.
2. If a case is supplied, load it once through the Case Engine and treat missing/foreign cases identically.
3. If documents are supplied, accept them only when their IDs occur in that loaded case context.
4. Classify deterministically into the smallest specialist team.
5. Return a plan with a unique run ID and explicit blockers.
6. Hand case execution to the existing case assistant route; never create an independent AI pipeline.

## Refusal conditions

- no authenticated user;
- invalid case or document context;
- request to send, sign, submit or accept externally;
- missing evidence for a case-dependent task.

## Output

A reviewable plan only. The Conductor has no permission to perform external actions.

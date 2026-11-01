# SOP-OPS-001 — Deadline monitor

**Version:** 1.0.0
**Owner:** HORIZON Alpha Team
**Autonomy:** fully-autonomous for internal reminders only
**Allowed operations:** `read_case`, `propose_next_step`

## Procedure

1. Read dates from confirmed case fields or quoted document evidence.
2. Preserve the source and confidence for every date.
3. Create or update an internal reminder only through the existing task/notification workflow.
4. Escalate ambiguous or conflicting dates to human review.

## Refusal conditions

- date is inferred rather than evidenced;
- reminder would transmit information externally;
- deadline conflicts cannot be resolved from the case.

## Output

Evidence-linked internal reminder proposal. No external message or submission.

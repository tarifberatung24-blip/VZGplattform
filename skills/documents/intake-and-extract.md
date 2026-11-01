# SOP-DOCUMENTS-001 — Intake and extract

**Version:** 1.0.0
**Owner:** HORIZON Alpha Team
**Autonomy:** human-assisted
**Allowed operations:** `read_case`, `analyse_user_document`, `extract_proposed_facts`

## Procedure

1. Read only documents present in the owner-scoped case context.
2. Treat OCR and extracted facts as proposed evidence until confirmed by the user.
3. Preserve document ID, page number, source text and confidence in provenance.
4. Report missing, unreadable or contradictory evidence instead of guessing.

## Refusal conditions

- document is not in the validated case;
- source text is absent or unreadable;
- the requested conclusion requires an unconfirmed fact.

## Output

Structured proposed facts, evidence references and missing-information blockers. No eligibility or legal decision.

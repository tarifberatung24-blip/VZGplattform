# BlackRock Source Map

> BlackRock materials are used only as architectural references. VZG must not copy branding, trademarks, visual identity, proprietary claims, or imply affiliation.

| BlackRock blueprint | VZG Capital interpretation | Boundary |
|---|---|---|
| `portfolio-review` | **VZG Capital Review** | Advisor review of approved client data, contracts, assumptions, risks, and strategy readiness. |
| `guided-portfolio-builder` | **Guided Finanz Analyse / confirmation flow** | Guided collection and confirmation of financial facts, goals, constraints, and missing inputs. |
| `portfolio-observations-and-opportunities` | **Opportunity & Gap Engine** | Deterministic observations about missing information, cost patterns, coverage gaps, and review opportunities. |
| `wealth-projections` | **Projection Engine** | Versioned deterministic projections with explicit assumptions, scenario labels, and feasibility states. |
| `guided-benchmark-selection` | **Scenario Baseline Selector** | Selection of conservative, balanced, or growth baselines after advisor review of risk and goals. |
| `ac360-capability-router` | **Capital Capability Router** | Internal routing of approved Capital capabilities and provider adapters; disabled by default until entitlement approval. |

## Shared architectural principles to preserve

The mapping is conceptual rather than a code-copying instruction. VZG should preserve the following useful patterns:

- Keep advisor and customer data separated.
- Make analyses and strategies versioned and reviewable.
- Use deterministic calculations rather than LLM-generated financial arithmetic.
- Store explicit assumptions, units, currencies, and effective dates.
- Represent missing data and feasibility as explicit states.
- Preserve provenance and evidence for extracted or external data.
- Use a server-side publish boundary rather than direct cross-household browser writes.
- Validate the canonical publish payload and its SHA-256 hash.
- Require idempotency keys for publish jobs.
- Write redacted audit events for approvals, corrections, exports, and publication.
- Enforce strict RLS for advisor and household data.
- Keep provider adapters disabled by default and enable only after entitlement and capability review.

## VZG terminology guidance

Use VZG/HAMMEL terminology in product surfaces. Prefer `Capital Review`, `Finanz Analyse`, `Opportunity & Gap Engine`, `Projection Engine`, `Scenario Baseline Selector`, and `Capital Capability Router`. Avoid presenting the BlackRock blueprint names to customers or implying that VZG is a BlackRock product.

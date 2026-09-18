# VZG Capital Layer — Reference Blueprint

> **Reference-only document.** This file is research material for CLINE. It is not an instruction to change production code, database schema, migrations, environment variables, or deployment configuration.

## Product boundary

VZG Capital is an advisor-led financial analysis and customer decision-support layer. The intended flow is:

```text
source documents and approved client data
  → structured analysis
  → deterministic calculations
  → advisor review
  → versioned publish package
  → customer dashboard
```

The advisor/customer boundary is explicit. Advisor records contain working analysis, documents, extraction corrections, assumptions, and drafts. Customer records contain only approved and published versions for the mapped household.

## Core architecture principles

### Separation of advisor and customer data

Advisor-owned data must be isolated from customer-readable household data. Customer access is household-scoped and deny-by-default. Cross-system publishing is a server-side boundary, never a direct browser write.

### Versioned analyses and strategies

Every financial analysis and strategy is immutable by version. A new correction creates a new version or a reviewed replacement; prior published versions remain auditable. Strategy records carry the calculation engine version, assumptions, disclaimer version, review state, and source references.

### Deterministic calculations

AI may extract, classify, explain, and ask for missing information. AI must not perform the financial mathematics, invent amounts, override assumptions, or present an unreviewed result as advice. Deterministic engines calculate monthly surplus, reserve targets, goal contributions, projections, feasibility, and scenarios.

### Explicit assumptions

Inflation, return rates, reserve months, minimum buffers, currencies, dates, and risk assumptions must be stored and displayed. Monetary persistence uses decimal/numeric values and explicit currency, never binary floating-point database columns.

### Missing-data and feasibility states

The engine must distinguish at least `needs_data`, `not_feasible`, `feasible`, and `review_required`. Missing inputs are named machine-readable values. A missing value must not be silently replaced by a guess.

### Provenance

Extracted and external data must carry source references, evidence, retrieval timestamps, source/version identifiers, units, currency, freshness state, and reviewer state. Raw external responses should not automatically become customer-visible data.

### Publish boundary

Publishing requires advisor approval, target-household mapping, approved analysis and strategy versions, schema version, disclaimer version, and a server-side job. The published package is validated before customer materialization.

### SHA-256 payload hash

The canonical publish payload is hashed with SHA-256. The supplied hash must match the canonical unsigned payload before a publish job is accepted. The hash is stored as an integrity and audit reference, not as a substitute for authorization.

### Idempotency

Every publish request has an idempotency key. Replaying the same key with the same payload returns the existing job. Reusing the key with a different payload or household is rejected as a conflict.

### Audit events

Advisor approvals, extraction corrections, strategy generation, exports, publish attempts, publish success/failure, and customer progress updates produce audit events. Metadata should contain redacted summaries and hashes, not raw secrets or unnecessary documents.

### Strict RLS

Advisor tables require the explicit advisor role and advisor ownership. Customer tables require ownership of the corresponding household. Anonymous access is denied. Server-controlled published records must not be writable by ordinary customer clients; customer progress updates are the narrow exception and remain household/user scoped.

### Provider adapters disabled by default

Aladdin, ADC, and other external provider adapters are optional. They remain disabled until entitlement, approved capabilities, data rights, retention, rate limits, and customer-facing usage are confirmed. No provider credential belongs in browser code, repository files, customer rows, or logs.

## Suggested implementation phases

1. Reconcile migration history in a staging target.
2. Add the Capital data foundation and RLS tests.
3. Add the deterministic engine with fixture tests.
4. Add advisor review and versioning.
5. Add the publish contract and idempotent job worker.
6. Add the customer dashboard read model.
7. Add a single read-only provider adapter only after entitlement approval.

## Non-goals for the first release

No trading, purchase, portfolio transaction, tax filing, official submission, insurance cancellation, or autonomous consequential action is part of this reference blueprint.

## Source references

- `../blackrock/` contains the pinned BlackRock Advisor Center skill blueprints.
- `types.ts`, `strategy-engine.ts`, and `capital-foundation.sql` are copied as reference-only artifacts from the earlier VZG Capital foundation work.
- `HAMMEL_VZG_CAPITAL_PRODUCT_VISION.txt` contains the product concept supplied for this research pack.

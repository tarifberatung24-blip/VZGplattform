# VZG Capital Target Architecture

**Status:** research-only target architecture. This document does not authorize runtime, schema, migration, provider, or deployment changes.

## Product flow

```text
Financial Data Graph
  → DIN 77230-inspired Finanz Analyse
  → DIN 77223-inspired Risk Profile
  → Opportunity & Gap Engine
  → Capital Engine
  → Projection Engine
  → Advisor Review
  → Publish Boundary
  → Customer Wealth Dashboard
  → Wealth Roadmap
```

The DIN labels above describe **independently authored inspirations**, not DIN compliance or copied normative implementation. DIN standards must not be ingested into AI/RAG or reproduced without confirmed DIN Media licensing.

## 1. Financial Data Graph

The graph is the source-of-truth layer for household facts. Each fact is typed, versioned, household-scoped, and linked to evidence. It should distinguish raw input, normalized value, derived value, confirmation, and publication state.

A fact is never silently upgraded from AI-derived to confirmed. Document extraction creates a draft fact with evidence; the user or advisor confirms it; deterministic engines consume only the permitted status for the relevant operation.

### FinancialFact

The canonical application-level shape should be independently designed along these lines:

```ts
type FinancialFact = {
  id: string
  householdId: string
  key: string
  value: unknown
  type: "money" | "number" | "boolean" | "date" | "text" | "enum"
  source: "USER_ENTERED" | "DOCUMENT" | "CONNECTED_PROVIDER" | "IMPORTED" | "AI_DERIVED" | "SYSTEM"
  provenance: {
    sourceReference: string | null
    evidenceReference: string | null
    extractionRunId: string | null
    sourceVersion: string | null
    observedAt: string | null
    retrievedAt: string | null
  }
  confidence: number | null
  observedAt: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  currency: string | null
  unit: string | null
  version: number
  status: "DRAFT" | "CONFIRMED" | "REJECTED" | "SUPERSEDED"
}
```

The exact database type and constraints must follow existing VZG/Supabase conventions after inspection. Monetary data must use decimal/numeric persistence and explicit currency; JavaScript number use requires careful boundary handling and tests.

## 2. Finanz Analyse

The analysis collects household facts, protection/provision/wealth-planning topics, goals, priorities, evidence, and missing data. It produces a versioned quantitative snapshot and a review state.

The analysis must remain separate from product selection, individualized recommendation, or execution. Its output should include named missing inputs and provenance for every material result.

Suggested states: `draft`, `in_review`, `approved`, `published`, `superseded`.

## 3. Risk Profile

The risk profile is a neutral, modular record with separate components:

- objective risk-bearing capacity based on verified financial facts;
- knowledge and experience evidence;
- subjective risk tolerance/willingness;
- purpose-specific context such as goal, horizon, amount, and liquidity needs;
- mismatch/comparison output between the profile and observed asset-risk structure.

Do not combine the components into an opaque score. A risk profile is not automatically a suitability determination or investment recommendation. Reassessment triggers, lifecycle, consent, and retention must be defined by VZG independently.

## 4. Opportunity & Gap Engine

The engine identifies missing or inconsistent facts, stale evidence, unconfirmed extraction, coverage gaps, contract/cost signals, and feasibility blockers. It must be deterministic and source-backed.

Every signal should include a rule version, input snapshot, evidence references, severity/state, explanation, and available next path. A gap is not a claim of savings and must not invent comparison offers or market prices.

## 5. Capital Engine

The core engine is deterministic and versioned. AI may extract/classify/explain and ask questions; it must not calculate financial mathematics or change assumptions.

Inputs include confirmed income, costs, debt payments, insurance costs, savings, goals, dates, risk-profile components, and explicit assumptions. Outputs include monthly surplus, reserve target, goal contribution, scenarios, allocation labels where permitted, feasibility, missing inputs, and explanation.

Every result records:

- engine version;
- input snapshot hash or immutable input reference;
- assumptions and units;
- calculation timestamp;
- provenance references;
- disclaimer version;
- feasibility state.

Recommended feasibility states: `needs_data`, `not_feasible`, `feasible`, `review_required`.

## 6. Projection Engine

Projection outputs are modeled scenarios, not guarantees or forecasts. The engine must expose assumptions, time horizon, currency, fee treatment where relevant, sensitivity/scenario labels, and missing-data behavior.

A projection must never be presented as realized return, expected certainty, or an individualized investment recommendation. Unsupported horizons, currencies, or inputs produce an explicit unsupported/missing state rather than a fabricated result.

## 7. Advisor Review

The advisor reviews extracted facts, evidence, assumptions, goals, risk-profile inputs, opportunity signals, and deterministic outputs. Review actions are versioned and audited.

The advisor/customer boundary is explicit:

- advisor workspace: drafts, source documents, corrections, assumptions, review notes;
- customer dashboard: only approved and published records for the mapped household;
- customer edits: narrow, household-scoped updates that create new facts/versions and audit events.

## 8. Publish Boundary

Publishing is a server-side operation requiring:

1. target household mapping;
2. approved analysis and strategy versions;
3. schema and disclaimer versions;
4. validated payload;
5. SHA-256 hash of the canonical unsigned payload;
6. idempotency key;
7. advisor authorization;
8. audit event for request and result.

A replay of the same idempotency key and same payload returns the existing job. Reuse with a different payload or household is rejected. Provider calls are not part of the publish operation unless independently approved and auditable.

## 9. Customer Wealth Dashboard

The customer view contains only published, household-scoped content: confirmed facts, goals, neutral scenarios, explanations, approved roadmap milestones, and progress updates. It must make assumptions, dates, units, and disclaimers visible.

No customer view may imply BlackRock/Aladdin affiliation, DIN certification, guaranteed outcomes, or an AI investment adviser.

## 10. Wealth Roadmap

A roadmap is a versioned set of milestones derived from approved goals and deterministic outputs. Each milestone has a metric, target value, date or explicit no-date state, current value when confirmed, status, source strategy, and localized customer copy.

Progress updates create new audit/provenance records. A customer change to savings or a goal must not mutate historical published versions; it should create a new fact/snapshot and trigger advisor review where required.

## Provider architecture

```text
Capital Capability Router
  ├── Internal deterministic engine (P0)
  ├── optional QuantLib adapter (P2)
  ├── optional PyPortfolioOpt adapter (P2)
  ├── optional Riskfolio-Lib adapter (P2)
  └── future external providers (LATER / DO_NOT_INTEGRATE until entitled)
```

The router returns capability availability and provenance. It never fabricates a provider result. Each provider adapter is isolated behind a narrow interface with version pinning, credential isolation, request correlation, bounded retry, rate-limit policy, timeout/LRO handling, pagination, audit events, and explicit failure states.

The BlackRock AladdinSDK and plugin-builder material are architecture references only. There is no verified VZG Aladdin access, tenant, entitlement, or API contract. Provider adapters are disabled by default.

## Governance and safety

- No fake Aladdin, fake quotes, fake market prices, or fake provider responses.
- No BlackRock branding, affiliation, endorsement, or customer-facing reuse of BlackRock-specific terminology.
- No copied DIN text, tables, formulas, thresholds, or claims of DIN compliance without licensing.
- No AI financial mathematics, personalized investment recommendations, trading, order execution, or official submissions.
- No secrets in source, prompts, browser code, logs, or customer rows.
- No automatic migration or deployment from this research document.
- Every calculation is deterministic, versioned, explainable, and source-backed.
- Every sensitive record is household-scoped and protected by strict RLS.

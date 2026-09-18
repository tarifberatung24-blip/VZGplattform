# VZG Capital Integration Priority

**Scope:** research-only classification for the V2 source pack. No item below authorizes implementation, dependency installation, provider access, migration, or deployment.

| Priority | Integration / source | Safe scope | Gate / prohibition |
|---|---|---|---|
| P0 | Internal deterministic Capital Engine | Household facts, goals, monthly surplus, reserve targets, neutral scenarios, feasibility states, explicit assumptions, versioned outputs | Must use confirmed/provenance-backed inputs; AI cannot perform arithmetic; no personalized investment recommendation. |
| P0 | FinancialFact and provenance model | Typed facts with value, source, evidence, confidence, observed/confirmed timestamps, currency/unit, version, and status | Strict household RLS; AI-derived facts cannot become confirmed without review. |
| P0 | Advisor review and publish boundary | Draft → advisor review → publish → customer; SHA-256 payload hash, idempotency, audit events | Server-side authorization and payload validation required; no direct browser publication. |
| P0 | DIN 77230-inspired structure | Independently authored household fact intake, protection/provision/wealth-planning sections, goals/priorities, quantitative actual-vs-target analysis | No DIN text/formula/table ingestion; no DIN compliance claim; separate DIN Media AI license required for standard processing. |
| P1 | DIN 77223-inspired risk profile | Separate capacity, knowledge/experience, subjective tolerance, purpose context, and neutral mismatch output | No copied questionnaire, matrix, scoring, thresholds, or suitability claim; license/legal review required. |
| P1 | Existing VZG documents/contracts/cases | Reuse confirmed document facts and contract/case evidence as input sources to Capital analysis | Evidence and user/advisor confirmation required; no invented savings, offers, quotes, or market prices. |
| P1 | Existing household/dashboard patterns | Publish only approved household-scoped snapshots, goals, strategies, milestones, and progress updates | Preserve existing RLS, auth, locale, and ownership conventions; no production schema change from research alone. |
| P1 | Actual Budget architecture patterns | Import/reconciliation semantics, recurring schedules, account graph, cash-flow/net-worth separation, local-first ownership | Prefer file/local or official Node API boundary; no REST assumption, no bank-provider entitlement, no copy of third-party data rights. |
| P1 | Capability Router control-plane pattern | Internal capability registry, provider status, bounded retry, correlation IDs, pagination/LRO interface design | Architecture-only until an approved VZG API contract exists; no fake provider result. |
| P1 | AladdinSDK/plugin-builder patterns | Versioned registry, provider isolation, scopes, configuration hierarchy, audit/effective dates, workflow states, dataset governance | No Aladdin integration, affiliation, API access, or trademark reuse; no trust/sandbox claim from plugin allowlist. |
| P2 | QuantLib adapter | Optional deterministic curves, dates, schedules, cash flows, discounting, fixed-income analytics | Pin a stable/reviewed release, preserve BSD/third-party notices, validate models and inputs; exclude stochastic modules from first slice. |
| P2 | PyPortfolioOpt adapter | Optional offline constrained optimization, HRP, Black-Litterman, covariance/risk models | Explicit validated inputs and assumptions; no execution, advice, market-data guarantee, or fabricated expected returns. |
| P2 | Riskfolio-Lib adapter | Optional offline advanced risk, risk budgets, tail/drawdown analytics, factors, Entropy Pooling, constrained optimization | Pin environment and solver licenses; numerical/model validation; no hosted API, execution, or advice claim. |
| LATER | Approved external data providers | Only after legal, consent, data minimization, security, retention, refresh/revocation, and provenance design | Provider-specific entitlement and contracts required; disabled by default. |
| LATER | Advisor/customer education layer | Source-backed contextual explanations and neutral scenarios | Editorial approval, citations, versioning, and disclaimer; AI cannot silently invent lessons or legal claims. |
| LATER | Portfolio monitoring from live providers | Read-only monitoring after connector review | Requires consent, refresh controls, revocation, security, error handling, provenance, and compliance review. |
| LATER | Public customer launch of regulated financial features | Only after legal/compliance review of advice boundary, disclosures, suitability, and partner model | No investment recommendation, ETF purchase, broker action, or regulated distribution in the research phase. |
| DO_NOT_INTEGRATE | Fake Aladdin / fake BlackRock affiliation | None | Prohibited. Never claim access, affiliation, endorsement, or use BlackRock branding. |
| DO_NOT_INTEGRATE | DIN standard ingestion into AI/RAG | None without separately confirmed AI license | Prohibited under ordinary use assumptions; no copied normative text or tables. |
| DO_NOT_INTEGRATE | AI financial mathematics | None | Deterministic versioned engines only. |
| DO_NOT_INTEGRATE | Personalized investment recommendations | None in current VZG scope | Requires legal/compliance/licensing model; neutral education and scenarios only. |
| DO_NOT_INTEGRATE | Fake quotes, prices, offers, savings, eligibility, or provider responses | None | Missing data is a blocker/state, never a value to invent. |
| DO_NOT_INTEGRATE | Trading, buying, selling, or official financial submissions | None | Consequential actions require separate authorized workflows and explicit user approval. |

## Recommended first implementation boundary

The safest first runtime slice is **P0 only**: provenance-backed household facts and goals, a deterministic neutral analysis/strategy engine, explicit missing-data/feasibility states, advisor review, and a server-side publish contract. It should operate on existing VZG data and test fixtures, without new external providers or production migrations until staging design and RLS tests are approved.

# VZGplattform — Feasibility Audit

## Executive decision

The document is **technically coherent as a long-term product direction**, but it contains three different scopes mixed together: a launchable VZGoffice/Home Office MVP, a later financial-health and education layer, and a regulated investment/financial-connectivity layer. The first scope is executable now. The second is executable after additive schema and product work. The third must remain disabled until legal, compliance, connector, security, and ownership requirements are resolved.

## 1. Executable now

| Document capability | Feasibility | Current evidence / action |
|---|---|---|
| Bulgarian/German pilot | **Ready** | Existing app supports the two pilot locales; the office schema supports six locales. |
| One dashboard for contracts and documents | **Ready** | Live dashboard, Workplace Action Center, contracts/documents routes, Frankfurt platform schema. |
| Contract archive and document archive | **Ready with testing** | Frankfurt has `contracts` and `documents`; household-scoped RLS is installed. End-to-end staging test remains required. |
| Deadlines and reminders | **Ready with integration** | Frankfurt has `deadlines`; existing platform has reminders/deadline concepts. UI and notification execution need final wiring. |
| Human-confirmed document analysis | **Ready as MVP** | Existing extraction/review flow, approval rules, document review tables, and no-auto-send policy support it. |
| Missing Information Interviewer, max. three questions | **Partially implemented** | Dashboard UI exists and shows real missing contract facts; persistent case-level question/answer storage still needs wiring to `platform_cases.missing_information`. |
| Radar for contract/document signals | **Pilot-ready** | Existing Radar logic and `contract_radar_history` design are present. Keep signals deterministic and source-backed. |
| AI Home Office Assistant | **Ready as controlled module** | VZGoffice schema, extraction, OCR, Groq draft generation, quota and circuit-breaker work exist. AI output must remain draft-only and human approved. |
| No automatic sending or financial decision | **Ready** | Architecture and dashboard rules explicitly require user confirmation. |
| Progressive onboarding / guided walkthrough | **Executable** | Implement as a short first-login tour, not seven mandatory screens. Existing profile and dashboard data are sufficient for phase 1. |
| `Learn → Understand → Apply` workflow | **Executable** | Start with contextual explanations around an actual document, contract, deadline, or cost. No separate Academy is needed. |
| Deterministic net-worth calculation | **Executable after schema addition** | Add explicit assets/liabilities tables with provenance, currency, valuation date, and user confirmation. Arithmetic must be deterministic. |
| Financial Journey progress model | **Executable after schema addition** | Add journey steps and completion criteria; use progressive disclosure. |

## 2. Executable after correction or additional implementation

| Document capability | Required correction |
|---|---|
| “AI analyzes every contract” | AI cannot be the source of truth. Use extraction → evidence → user confirmation → derived insight. Store document/page evidence and provenance for every critical fact. |
| “Comparison and savings” | Only compare verified tariffs/offers supplied by an approved data source or manual desk. Do not calculate savings from invented market prices. |
| “Kündigung directly through the platform” | Prepare a cancellation draft and checklist first. Sending or submitting requires explicit user approval and a configured, lawful channel. |
| Financial profile | Split `financial_profiles` into typed, versioned facts or add a fact table with `source_type`, `source_reference`, `confidence`, `confirmed_at`, `currency`, and `observed_at`. |
| Provenance values | Implement one shared enum/check constraint: `SOURCE`, `USER_ENTERED`, `DOCUMENT`, `CONNECTED_PROVIDER`, `IMPORTED`, `AI_DERIVED`. `AI_DERIVED` must always reference its input facts and never be treated as confirmed fact. |
| Financial Health Score | Implement as a documented deterministic ruleset with version, input snapshot, missing-data handling, and explanation. Do not use an opaque AI score. A score should be “insufficient data” rather than fabricated. |
| Goals and scenarios | Add `financial_goals`, `goal_contributions`, and scenario snapshots. Scenarios may educate and calculate, but must not become personalized investment recommendations without compliance review. |
| Financial education | Store source documents, concepts, lessons, quizzes, locale, version, and citation links. AI may explain approved content but should not silently invent lessons or legal/financial claims. |
| Adaptive learning level | Implement only after quiz results and explicit progression rules exist. Beginner/intermediate labels must not be inferred from sensitive financial data alone. |
| Three-agent model plus orchestrator | Use deterministic routing first: document/case intent → Home Office; numerical profile → Financial Analysis; lesson/goal → Education. AI orchestration should not autonomously trigger external actions. |
| Notifications through n8n | Requires a configured connector/webhook, consent model, retry/idempotency, audit logs, and a deployment environment. Keep it out of the zero-cost MVP unless the connector is already available. |
| Knowledge Layer from uploaded materials | Feasible, but only with an editorial approval step and source/version tracking. Uploaded owner documents must remain private and must not become global training data. |

## 3. Not executable safely in the current MVP

| Document item | Why it is blocked / unsafe |
|---|---|
| Automatic bank, credit-card, investment-account or broker connections | No approved connector, consent workflow, provider contracts, security review, or data minimization design is in place. |
| Automatic Schufa import | Requires a lawful, authorized connector and a clear consent/contractual basis. A free-text “enter your Schufa data” field is technically possible, but should not be presented as an official Schufa connection. |
| Personalized ETF/investment recommendations | This can constitute regulated investment advice or distribution in Germany/EU. It requires a qualified compliance/legal model, disclosures, suitability/appropriateness handling, records, and potentially licensed partners. Keep to education and neutral scenarios for now. |
| “Buy ETF” or submitting financial products through AI | Explicitly prohibited by the product safety boundary. AI may explain, compare verified information, simulate scenarios, and prepare a user-reviewable plan; it must not execute purchases or submissions. |
| Portfolio monitoring from live providers | Blocked until connectors, refresh consent, revocation, storage/security, error handling, and data provenance are implemented. |
| Public launch with unfinished legal pages | Blocked until Impressum, Datenschutzerklärung, AGB/terms, AI disclaimer, data-processing roles, retention, and external-provider disclosures are completed by the owner/legal reviewer. |
| Migration of the six old Auth accounts | Correctly excluded because they are disposable test accounts. No user-owned US data should be copied into Frankfurt. |

## 4. Recommended build order

1. **Finish the Home Office MVP:** persistent `platform_cases` facts/questions, document review confirmation, deadlines, deterministic Radar, and staging end-to-end tests.
2. **Add provenance and financial facts:** assets, liabilities, cashflow, goals, and deterministic net worth. Keep all data household-scoped and user-confirmed.
3. **Add contextual education:** short source-backed lessons inside workflows, not a separate Academy.
4. **Add Financial Health:** deterministic versioned score with “insufficient data” states.
5. **Add scenarios:** neutral what-if calculations with clear assumptions and no product recommendation.
6. **Only after legal/compliance review:** evaluate Schufa, bank, broker, and provider connectors.
7. **Only after owner/legal approval:** consider partner offers or affiliate placements, separated from neutral analysis and clearly disclosed.

## Final classification

**The first layer in the document is executable and aligns with the current build.** The Capital extension is a valid future module inside the same account, but should begin with financial facts, goals, education, deterministic calculations, and neutral scenarios. The connector and investment-advice sections are not launchable in the current MVP and must not be implemented as automatic AI features.

The Frankfurt schema migration already created the foundation without copying old test data. The next safe implementation is persistent `platform_cases.missing_information` plus a provenance-backed financial profile—not investment connectors.

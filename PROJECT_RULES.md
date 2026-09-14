# FinanzBG Project Rules

## Strategic Direction

FinanzBG is the primary strategic product: a unified financial and administrative operating center for people in Germany. The architecture includes:

- Financial Profile
- Financial Data Graph
- Documents
- Cases
- Contracts
- Income/Expenses
- Deadlines
- Steuer
- Tarife
- Versicherungen
- Banking
- Kredite
- Sozialleistungen
- Employment
- Opportunity Engine
- Risk Engine
- Rules Engine
- Scenario Engine
- AI Explanation Layer

The product flow is:

`DATA → UNDERSTANDING → RISK / OPPORTUNITY ANALYSIS → DECISION SUPPORT → ACTION → MONITORING`

User actions must follow:

`ANALYZE → EXPLAIN → REVIEW → USER APPROVES → EXECUTE`

## Source, Framework, and Infrastructure

- GitHub `main` in `finanzbg-original` is the single source of truth.
- The application framework is Next.js.
- pnpm is the package manager; preserve the repository's lockfile and package-manager policy.
- The Vercel Framework Preset must remain Next.js.
- Protected infrastructure settings include Vercel, Supabase, deployment configuration, environment variables, auth configuration, redirects, and production routing. Do not change them without explicit approval.

## Change Scope

- Make minimal-scope changes only.
- Do not perform unrelated redesigns, refactors, dependency upgrades, or file moves.
- Do not modify business logic, schema, auth, or infrastructure unless the task explicitly requires it.
- Never create fake functionality, fake tax results, fake savings, fake eligibility, fake OCR, fake API responses, or invented government/form mappings.
- If required data or integration is missing, state the blocker instead of inventing a result.

## Logic and Data Integrity

- Critical logic must be deterministic, versioned, explainable, and source-backed.
- Preserve provenance for rules, calculations, government forms, deadlines, and partner recommendations.
- Use RLS and strict user-data isolation for user-scoped data.
- Never expose secrets, service-role credentials, tokens, or private environment values.
- Never make destructive database changes without explicit approval and a reversible plan.

## Collaboration and Validation

- Only one active AI agent may modify a module or its files at a time.
- Before implementation, inspect the latest `main` and the existing patterns.
- Required before handoff: typecheck, production build, and applicable tests.
- Verify deployment with real HTTP checks against the actual routes; do not rely only on compilation.
- Keep changes auditable and report exactly what changed.

## Required Final Task Report

```text
TASK:
STATUS:
FILES CHANGED:
COMMIT:
TYPECHECK:
BUILD:
TESTS:
DEPLOYMENT:
HTTP CHECK:
BLOCKERS:
NOT IMPLEMENTED:
NEXT RECOMMENDED STEP:
```

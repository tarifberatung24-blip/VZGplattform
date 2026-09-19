# VZGplattform Project Rules

## Canonical Identity

These four names are distinct and must not be used interchangeably:

- **LEGAL ENTITY:** `Tarifberater24` — the contracting party and data controller.
- **EXPERT BRAND:** `VZG CONSULT` — the consulting brand.
- **PRODUCT:** `HORIZON by VZG` — the customer-facing product.
- **CODEBASE:** `VZGplattform` — the repository and internal project identity.

## Strategic Direction

`HORIZON by VZG` is the customer-facing product of the legal entity `Tarifberater24` (expert brand `VZG CONSULT`); the codebase is `VZGplattform`. It is a unified financial and administrative operating center for people in Germany. The architecture includes:

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

## Canonical Build Map and Sequencing

- `docs/HORIZON_MASTER_MAP.md` is the canonical TARGET build map. It fixes the phase order and the
  shared-engine architecture; it does not authorize implementation.
- `docs/HORIZON_BUILD_LEDGER.md` tracks implementation status for every phase.
- `docs/HORIZON_EXECUTION_CHECKLIST.md` is the plain working list. A `✅` there means the item is
  actually done and verified; an unchecked item still needs work or confirmation. The checklist
  does not override the Master Map, the Build Ledger, or these rules.
- Work proceeds sequentially by approved phase. Only one implementation phase may be active at a
  time unless the owner explicitly authorizes otherwise.
- A later phase must not be started merely because its files already exist.
- Unrelated refactoring of earlier phases is prohibited.
- Before every task, the agent must state: `ACTIVE_PHASE`, `ALLOWED_FILES`,
  `FROZEN_FILES / SYSTEMS`, `OUT_OF_SCOPE`.
- Existing Capital work is preserved untouched and is **outside** the current active build
  sequence. It may only be resumed by explicit owner instruction.

## Canonical Case Model

- `public.cases` is the canonical HORIZON case model. Tenancy is **owner-scoped via `auth.uid()`**.
- The `platform_cases`, `platform_tasks`, `platform_correspondence_drafts`, `platform_approvals`,
  and `platform_audit_events` family is a **preserved legacy / compatibility surface**. It must not
  be deleted, destructively migrated, or used as the canonical model for new HORIZON workflows.
- New P3–P17 functionality uses the canonical `cases` family. Where existing code still depends on
  `platform_*`, use thin compatibility adapters only.
- Database evolution for the canonical family is **additive**. Destructive schema changes, table
  drops, destructive renames, and user-data deletion require explicit owner authorization.

## Lifecycle: DONE and FROZEN

A system moves through:

```text
NOT_STARTED → AUDITED → PLANNED → IN_PROGRESS → TESTING → DONE → FROZEN
```

`BLOCKED` may be used when an external dependency prevents completion.

**DONE** requires all applicable items: user journey complete; correct routes complete; frontend
complete enough to use; backend complete; persistence where required; authorization/RLS where
required; integrations where required; loading/error/empty states; user approval boundaries;
applicable legal/safety boundaries; tests pass; build passes; real functional verification passes;
no known critical blocker remains. A module is **not** DONE merely because code exists, and a flow
not verified end-to-end is not DONE.

**FROZEN** applies only after a module is DONE and explicitly accepted by the owner. A FROZEN
module must not be modified, renamed, refactored, redesigned, extended, migrated, or replaced
unless the owner explicitly reopens it. Never modify a FROZEN module as collateral work for
another task.

## Source, Framework, and Infrastructure

- GitHub `main` in `tarifberatung24-blip/VZGplattform` is the single source of truth.
- The application framework is Next.js.
- pnpm is the package manager; preserve the repository's lockfile and package-manager policy.
- The current production deployment is **Render**, deploying from GitHub `main`.
- Vercel and v0 are **not** the current production authority. They may be used later for approved UI/template work only, after explicit owner approval.
- Protected infrastructure settings include Render, Supabase, deployment configuration, environment variables, auth configuration, redirects, and production routing. Do not change them without explicit approval.

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

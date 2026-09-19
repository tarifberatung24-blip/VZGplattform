# VZGplattform AI Workflow

## Canonical Identity

- **LEGAL ENTITY:** `Tarifberater24`
- **EXPERT BRAND:** `VZG CONSULT`
- **PRODUCT:** `HORIZON by VZG`
- **CODEBASE:** `VZGplattform`

Do not use these four names interchangeably. Details are in `PROJECT_RULES.md`.

## Standard Workflow

1. READ
2. DEFINE SCOPE
3. INSPECT LATEST MAIN
4. CREATE FOCUSED BRANCH
5. IMPLEMENT SMALL CHANGE
6. VALIDATE
7. OPEN PR
8. REVIEW
9. OWNER APPROVES
10. MERGE
11. DEPLOY IF AUTHORIZED
12. VERIFY
13. HANDOFF

Never allow two agents to modify the same module at the same time. Do not invent missing data. Deployment and merge require explicit owner approval.

## Canonical Build Map and Sequencing

`docs/HORIZON_MASTER_MAP.md` is the canonical target build map;
`docs/HORIZON_BUILD_LEDGER.md` tracks implementation status;
`docs/HORIZON_EXECUTION_CHECKLIST.md` is the plain working list (`✅` = done and verified).

- Phases run in the order fixed by the Master Map. Only one implementation phase is active at a
  time unless the owner explicitly authorizes otherwise.
- A later phase must not be started merely because its files already exist.
- DONE requires the complete definition in `PROJECT_RULES.md`. A module is not DONE because code
  exists, and a flow not verified end-to-end is not DONE.
- An accepted DONE module becomes FROZEN. A FROZEN module cannot be changed without explicit owner
  reopening, and must never be modified as collateral work for another task.
- Unrelated refactoring of previous phases is prohibited.
- Capital is preserved but outside the current active build sequence.
- `public.cases` is the canonical owner-scoped case model. `platform_*` is a preserved legacy /
  compatibility surface: not deleted, not destructively migrated, and not the base for new
  HORIZON workflows. New P3–P17 work uses `cases`; `platform_*` consumers get thin adapters only.

Step 2 (DEFINE SCOPE) must explicitly declare: `ACTIVE_PHASE`, `ALLOWED_FILES`,
`FROZEN_FILES / SYSTEMS`, `OUT_OF_SCOPE`.

### Phase-scoped context loading

For a normal phase task, do not read the whole Master Map and Build Ledger. Load the phase context
with:

```bash
node scripts/horizon-context.mjs <ACTIVE_PHASE>   # e.g. P1, P5, P9, P12
```

The loader prints only the requested phase context (identity, governance, Master Map section,
ledger record, dependencies, frozen systems, owner approval, out-of-scope, source files) and exits
non-zero on an invalid phase or a missing heading. `docs/HORIZON_CONTEXT_INDEX.json` contains only
phase → heading mappings and never duplicates phase requirements.

Load the complete `docs/HORIZON_MASTER_MAP.md` or `docs/HORIZON_BUILD_LEDGER.md` only when:

- architecture or governance is being changed;
- the loader cannot resolve the required context;
- the owner requests a cross-phase audit.

## Roles

- **CHATGPT:** architecture, orchestration, planning, prompt design, review
- **AIONUI:** local multi-agent workspace / control interface
- **OPENHANDS:** focused repository implementation, testing, branches, PRs
- **OPENCLAW:** reusable local AI agent, usable through AionUi when available
- **MANUS:** research, source gathering, setup work
- **GORDON:** Docker diagnostics and environment optimization
- **v0:** optional approved UI/design implementation source
- **GITHUB MAIN:** source of truth — `tarifberatung24-blip/VZGplattform` (`main`)
- **RENDER:** current production deployment, from GitHub `main`

## Product Principle

`HORIZON by VZG` follows:

`DATA → UNDERSTANDING → RISK / OPPORTUNITY ANALYSIS → DECISION SUPPORT → ACTION → MONITORING`

User-facing execution follows:

`ANALYZE → EXPLAIN → REVIEW → USER APPROVES → EXECUTE`

Critical logic is deterministic, versioned, source-backed, and explainable. Missing data must be surfaced as a blocker, never filled with invented tax outcomes, savings, eligibility, OCR, API responses, or government/form mappings.

## Required Task Completion Report

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

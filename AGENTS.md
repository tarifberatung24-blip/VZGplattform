# VZGplattform coding-agent entry point

Read `PROJECT_RULES.md`, `AI_WORKFLOW.md`, and `docs/TERRA_START.md` before work.

Canonical identity: LEGAL ENTITY `Tarifberater24`, EXPERT BRAND `VZG CONSULT`, PRODUCT `HORIZON by VZG`, CODEBASE `VZGplattform`. Keep these four names distinct; do not use them interchangeably.

The current user-approved product direction is **HORIZON by VZG** as a management center for contracts, recurring obligations, important dates and financial control in Germany. The core product loop is: discover contracts/costs → track lifecycle dates and Preisgarantie/Kündigungsfrist where evidenced → warn → compare → optimize through real approved partner/affiliate offers → renew/switch only by user decision → continue monitoring. Documents, cases, Agentur/Jobcenter, tax, cancellation and explanation modules support this management system rather than define the whole product. The long-term **HORIZON Capital** layer is preserved for later: research, risk/scenario analysis, deterministic compound-interest and long-term traditional-asset planning, with **cryptocurrency explicitly out of scope**. Capital remains outside the active P0–P17 sequence until the owner explicitly reopens it. B2B remains a separate draft. Safety, legal, evidence and user-approval boundaries remain unchanged.

## Current development stack

- **ChatGPT** — architecture, orchestration, planning, prompt design, review
- **AionUi** — local multi-agent workspace / control interface
- **OpenHands** — focused repository implementation, testing, branches, and PRs
- **OpenClaw** — reusable local AI agent, usable through AionUi when available
- **Manus** — research, source gathering, and setup work
- **Gordon** — Docker diagnostics and environment optimization
- **v0** — optional approved UI/design implementation source
- **GitHub `main`** — single source of truth: `tarifberatung24-blip/VZGplattform`

## Canonical build map and phase governance

- `docs/HORIZON_MASTER_MAP.md` is the canonical target build map.
- `docs/HORIZON_BUILD_LEDGER.md` tracks implementation status per phase.
- `docs/HORIZON_EXECUTION_CHECKLIST.md` is the plain working list; a `✅` means done and verified.
- Work proceeds sequentially by approved phase; only one implementation phase is active at a time
  unless the owner explicitly authorizes otherwise.
- A later phase must not be started merely because its files already exist.
- DONE requires the full definition in `PROJECT_RULES.md`; accepted DONE modules become FROZEN.
- FROZEN modules cannot be changed without explicit owner reopening.
- Unrelated refactoring of previous phases is prohibited.
- Existing Capital work is preserved but is outside the current active build sequence.
- `public.cases` is the canonical owner-scoped case model. The `platform_*` family is a preserved
  legacy / compatibility surface: do not delete, destructively migrate, or build new workflows on
  it. New P3–P17 work uses `cases`; bridge `platform_*` consumers with thin adapters only.
- Render remains the current production deployment authority, from GitHub `main`.

Before every task, state: `ACTIVE_PHASE`, `ALLOWED_FILES`, `FROZEN_FILES / SYSTEMS`, `OUT_OF_SCOPE`.

## Phase-scoped context loading

For a normal phase task, load context with the phase-scoped loader instead of reading the whole
Master Map and Build Ledger:

```bash
node scripts/horizon-context.mjs <ACTIVE_PHASE>   # e.g. P1, P5, P9, P12
```

It prints only that phase's context, and it fails non-zero on an invalid phase or a missing heading.
`docs/HORIZON_CONTEXT_INDEX.json` holds phase → heading mappings only; it never restates phase
requirements.

Do not load the complete `docs/HORIZON_MASTER_MAP.md` or `docs/HORIZON_BUILD_LEDGER.md` unless:

- architecture or governance is being changed;
- the loader cannot resolve required context;
- the owner requests a cross-phase audit.

## Rules

- AionUi does **not** replace GitHub. GitHub `main` remains the source of truth.
- Model/agent identity and connected tools are controlled by the host; this file does not switch the model or grant permissions.
- One writer per module. Never allow two agents to modify the same module at the same time.
- Inspect the latest `main` before implementation.
- No merge, deployment, database/schema/RLS/environment, or production infrastructure changes without explicit owner approval.
- Preserve all pre-existing dirty changes. Do not use `git add .`, automatic stash, reset, checkout-overwrite, or clean. Do not commit/push unrelated work.
- Do not weaken existing security or safety rules.

First run `node scripts/terra-preflight.mjs`. Its output distinguishes tool readiness from integration readiness. A missing cloud key must not block isolated local regression tests, but must block claims of end-to-end success.

Use the existing pnpm lockfile. Run TypeScript explicitly with `pnpm exec tsc --noEmit`; the existing CI optional typecheck can otherwise skip it. Do not install new dependencies, rewrite the lockfile, or upgrade tools merely because a different version is available.

Never print environment values, credentials, full customer files, or authenticated URLs.

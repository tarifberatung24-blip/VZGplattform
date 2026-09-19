# VZGplattform coding-agent entry point

Read `PROJECT_RULES.md`, `AI_WORKFLOW.md`, and `docs/TERRA_START.md` before work.

Canonical identity: LEGAL ENTITY `Tarifberater24`, EXPERT BRAND `VZG CONSULT`, PRODUCT `HORIZON by VZG`, CODEBASE `VZGplattform`. Keep these four names distinct; do not use them interchangeably.

The current user-approved product direction is **HORIZON by VZG**, V1 for private customers: contract management, private documents, translation/explanation, deadlines, and user-approved actions. B2B remains a separate draft. This narrows the older broad product roadmap; it does not relax its safety rules.

## Current development stack

- **ChatGPT** — architecture, orchestration, planning, prompt design, review
- **AionUi** — local multi-agent workspace / control interface
- **OpenHands** — focused repository implementation, testing, branches, and PRs
- **OpenClaw** — reusable local AI agent, usable through AionUi when available
- **Manus** — research, source gathering, and setup work
- **Gordon** — Docker diagnostics and environment optimization
- **v0** — optional approved UI/design implementation source
- **GitHub `main`** — single source of truth: `tarifberatung24-blip/VZGplattform`

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

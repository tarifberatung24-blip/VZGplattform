# VZGplattform Copilot Instructions

Canonical identity: LEGAL ENTITY `Tarifberater24`, EXPERT BRAND `VZG CONSULT`, PRODUCT `HORIZON by VZG`, CODEBASE `VZGplattform`. Keep these distinct. See `/PROJECT_RULES.md`.

Source of truth: `tarifberatung24-blip/VZGplattform` (`main`).

Before proposing or making changes:

- Read `/AGENTS.md`, `/PROJECT_RULES.md`, and `/AI_WORKFLOW.md`. Read `/docs/TERRA_START.md` when the task is Terra-related or touches the currently assigned work package.
- Inspect the latest `main` branch and existing implementation.
- Modify only the requested scope; do not rewrite unrelated modules.
- Only one writer per module at a time; do not overwrite another agent's uncommitted work.
- Do not change Vercel infrastructure or protected settings without explicit instruction.
- Do not apply migrations or deploy to production without explicit authorization for that exact action.
- Report validation results and blockers, including typecheck, build, tests, and route checks when applicable.

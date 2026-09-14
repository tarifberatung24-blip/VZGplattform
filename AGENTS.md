# KintexBG coding-agent entry point

Read `PROJECT_RULES.md`, `AI_WORKFLOW.md`, and `docs/TERRA_START.md` before work.

The current user-approved product direction is **KintexBG von vzg consult — ВСИЧКО НА ЕДНА РЪКА**, V1 for private customers: contract management, private documents, translation/explanation, deadlines, and user-approved actions. B2B remains a separate draft. This narrows the older broad product roadmap; it does not relax its safety rules.

The current task is preparation for Terra, not permission to execute the entire roadmap. Start implementation only when assigned a specific work package. Do not change production settings, deploy, apply migrations, send campaigns, or provision paid resources without explicit authorization. Read-only connector checks are allowed within the assigned task.

Preserve all pre-existing dirty changes. Do not use `git add .`, automatic stash, reset, checkout-overwrite, or clean. Do not commit/push unrelated work. One writer per module.

First run `node scripts/terra-preflight.mjs`. Its output distinguishes tool readiness from integration readiness. A missing cloud key must not block isolated local regression tests, but must block claims of end-to-end success.

Use the existing pnpm lockfile. Run TypeScript explicitly with `pnpm exec tsc --noEmit`; the existing CI optional typecheck can otherwise skip it. Do not install new dependencies, rewrite the lockfile, or upgrade tools merely because a different version is available.

Never print environment values, credentials, full customer files, or authenticated URLs. Model/agent identity and connected tools are controlled by the host; this file does not switch the model or grant permissions.

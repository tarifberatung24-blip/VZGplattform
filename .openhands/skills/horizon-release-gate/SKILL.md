---
name: horizon-release-gate
description: Run the final quality gate for a focused HORIZON change and produce an auditable handoff.
---

Use before calling a focused change ready for review, merge, or deployment.

Run the applicable checks in order: `git diff --check`, `pnpm exec tsc --noEmit`, `pnpm lint`, focused tests, full tests, and `pnpm build`.
Record commands that were not run and why. Distinguish PASS, FAIL, and BLOCKED; do not convert missing cloud credentials into success.
Review changed files for scope, secrets, user-data exposure, untranslated strings, missing states, and approval bypasses.
Produce the repository handoff fields: TASK, STATUS, FILES CHANGED, COMMIT, TYPECHECK, BUILD, TESTS, DEPLOYMENT, HTTP CHECK, BLOCKERS, NOT IMPLEMENTED, NEXT RECOMMENDED STEP.
Do not merge, push, deploy, alter schema, or change infrastructure without explicit owner approval.

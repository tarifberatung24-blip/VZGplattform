---
description: Run every local gate and print the project completion report
---
Run the project gates in this order and stop at the first failure only to report it, not to "fix" unrelated code:

1. `node scripts/terra-preflight.mjs`
2. `git status --short` and `git diff --check`
3. `pnpm exec tsc --noEmit`
4. `pnpm lint` (0 errors required; list new warnings)
5. `pnpm i18n:verify` when any copy, messages/*.json or user-facing text changed
6. `pnpm test` (vitest plus `node --test scripts/*.test.mjs`)

Then print the report block from AGENTS.md in Bulgarian, with exact numbers:
`TASK / STATUS / FILES CHANGED / COMMIT / TYPECHECK / BUILD / TESTS / DEPLOYMENT / HTTP CHECK / BLOCKERS / NOT IMPLEMENTED / NEXT RECOMMENDED STEP`.
Use NOT RUN, BLOCKED or NOT APPLICABLE honestly. `pnpm build` needs network for Google Fonts: say "CI is authoritative" if it was not run. $ARGUMENTS

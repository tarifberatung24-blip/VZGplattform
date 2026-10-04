---
name: horizon-phase-context
description: Load the approved HORIZON phase context before implementing a phase-scoped change.
---

Use this skill for any implementation task that names a HORIZON phase or touches phase-owned files.

1. Declare ACTIVE_PHASE, ALLOWED_FILES, FROZEN_FILES / SYSTEMS, and OUT_OF_SCOPE.
2. Run `node scripts/horizon-context.mjs <ACTIVE_PHASE>` from the repository root.
3. Inspect only the returned phase context and the relevant source files.
4. Stop if the requested phase is not approved, is frozen, or has an unresolved dependency.
5. Report phase status separately from code status; code existing is not proof that the phase is DONE.

Do not start multiple implementation phases in one task and do not edit the Master Map or Build Ledger to make work appear complete.

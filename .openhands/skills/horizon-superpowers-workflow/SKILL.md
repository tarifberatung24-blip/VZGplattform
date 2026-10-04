---
name: horizon-superpowers-workflow
description: Use a disciplined specification, implementation, test, review, and verification loop for HORIZON engineering tasks.
---

Use this workflow for meaningful implementation work:

1. Clarify the outcome, constraints, active phase, allowed files, and frozen systems.
2. Inspect the existing implementation and write a short acceptance specification.
3. Break the work into the smallest independently verifiable tasks.
4. Add or update a failing focused test when practical, then implement the smallest change.
5. Run targeted tests, typecheck, and the relevant build or smoke test.
6. Review the diff for scope creep, security, ownership, provenance, and regressions.
7. Report evidence and remaining blockers. Do not claim completion from compilation alone.

Keep one writer per module. Do not create parallel edits to the same files. Do not commit,
push, deploy, change schema, or change production configuration unless the owner explicitly
requests that action. Do not create autonomous loops that can modify unrelated modules.

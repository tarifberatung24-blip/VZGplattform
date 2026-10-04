---
name: horizon-test-generation
description: Generate focused regression tests from invariants, boundaries, and observed defects.
---

Use when changing logic, routes, validation, auth, storage, or user workflows.

Start with the invariant and a failing test when practical. Cover happy path, missing input, malformed input, unauthorized user, other owner, retry, and persistence failure. Prefer deterministic synthetic fixtures. Test behavior and security boundaries, not implementation wording or snapshots alone.

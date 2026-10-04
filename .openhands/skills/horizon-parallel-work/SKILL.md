---
name: horizon-parallel-work
description: Split independent work across agents while preventing file, branch, and artifact conflicts.
---

Use for parallel implementation or review.

Partition by non-overlapping files or read-only roles. Give each worker a fixed scope and base revision. Require isolated branches or worktrees for writers. Merge through one coordinator after diff, test, and conflict review. Cancel duplicate work early and never allow two agents to own the same module.

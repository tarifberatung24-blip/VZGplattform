---
name: horizon-permission-boundary
description: Design explicit approval gates for tools that can mutate code, data, accounts, or external systems.
---

Use before enabling write-capable tools or autonomous loops.

Classify actions as read, reversible write, consequential write, or destructive write. Require confirmation immediately before consequential/destructive actions unless a narrow prior authorization covers the exact action. Keep dry-run and preview modes available. Log decision, actor, target, and result without secrets.

---
name: horizon-supabase-audit
description: Audit Supabase project, migrations, RLS, storage, and auth metadata without mutating production.
---

Use for database, storage, auth, RLS, or project-identity questions.

Confirm the canonical project from repository configuration. Inspect metadata read-only first. Compare migration history with deployed state and identify gaps before proposing additive changes. Verify owner isolation and service-role boundaries. Never apply migrations, delete data, rotate keys, or inspect customer rows without explicit approval and a reversible plan.

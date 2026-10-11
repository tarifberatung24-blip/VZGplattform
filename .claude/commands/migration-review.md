---
description: Review a Supabase migration before the owner applies it
---
Review the migration file(s) in `supabase/migrations/` named in $ARGUMENTS (or the newest one). Report findings in Bulgarian, most severe first. Check:

- **Additive and idempotent:** `if not exists`, guarded `drop … if exists` only for objects the migration creates; no data loss; safe to re-run.
- **RLS:** every new table has `enable row level security`; policies use `(select auth.uid())`; owners can only reach their own rows; service-role-only tables have no client policy.
- **Grants:** explicit `revoke` from `anon`/`authenticated` where needed; no `grant all` to clients.
- **Foreign keys:** `on delete` behaviour fits DSGVO deletion (user delete → cascade or set null); FK columns are indexed.
- **Functions/triggers:** `security invoker` unless definer is justified; `set search_path`.
- **Constraints:** checks that encode business rules (amounts > 0, allowed statuses).
- **Code fallback:** the app keeps working before the migration is applied.
- **Live state (read-only):** with the Supabase MCP, confirm the objects it touches exist as expected. Never apply it yourself without the owner's explicit approval; after applying, re-check columns, policies, grants and `get_advisors`.

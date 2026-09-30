# Evidence: audit_events shape mismatch (local reproduction)

Date: 2026-09-30. Method: local Supabase stack started from this repo's own
migrations, then queried directly. Reproducible, read-only against production.

## What the migrations produce

Applying every migration in `supabase/migrations/` yields:

```
audit_events columns: id, actor_id, case_id, action, metadata, created_at
RLS: enabled
policies: audit_events_insert_own (INSERT), audit_events_read_own (SELECT)
```

That is the canonical HORIZON shape (shape B). The migrations are internally
consistent: `20260920090000_horizon_audit_events_reconcile.sql` creates the
canonical table, and `20260920090100_horizon_case_engine_rls_policies.sql`
declares the INSERT policy scoped to `actor_id`.

Note: `20260928090000_audit_events_insert_grant_restore.sql` applies cleanly
against this schema. Its column grant is valid here.

## What the writers do

Seven routes insert the legacy Kintex shape (shape A) with columns that do not
exist in the canonical table:

```
app/api/contracts/route.ts:52
app/api/contracts/[id]/route.ts:43, :59
app/api/documents/review/route.ts:62
app/api/documents/extract/route.ts:41
app/api/documents/upload/route.ts:44
app/api/documents/analyze/route.ts:36
```

They send: `household_id, actor_user_id, entity_type, entity_id, event_type,
event_summary, metadata`.

Two writers plus one reader use the canonical shape:
`lib/horizon/case/repository.ts:716` (appendAudit) and `:727` (listAudit).

## Reproduction

Direct SQL:

```
insert into public.audit_events
  (household_id, actor_user_id, entity_type, event_id, event_type, event_summary)
-> ERROR: column "household_id" of relation "audit_events" does not exist
```

PostgREST (the exact layer the application uses), legacy shape:

```
POST /rest/v1/audit_events
  {"household_id":...,"actor_user_id":...,"entity_type":...,"event_type":...}
-> HTTP 400 {"code":"PGRST204","message":"Could not find the'actor_user_id' column
   of 'audit_events' in the schema cache"}
```

PostgREST, canonical shape (passes the column check):

```
POST /rest/v1/audit_events {"actor_id":...,"action":...,"metadata":{}}
-> HTTP 409 (only the FK to auth.users fails, because the id is synthetic)
```

## Impact

The seven writers fail with `PGRST204`. None of the seven checks the returned
error - they `await` the insert and continue. The user-visible operation
(upload, extract, analyze, review, contract create/update/delete) still
returns success, so this is silent data loss, not a hard failure:

- no audit rows are written for those seven actions;
- the write itself does not roll back, so the document/contract is still saved.

## Confidence and remaining unknown

HIGH confidence that the seven writers cannot work against the schema this
repository defines. Proven by reproduction.

UNKNOWN: whether production actually matches these migrations. The reconcile
migration states production was missing the table and was recreated
canonically, but that is a claim in a migration comment, not verified output.
If production were still the legacy shape, the seven writers would work and
the canonical writers would fail instead. Exactly one side is broken either way.

## Fix direction

Convert the seven writers to the canonical columns
(`actor_id, case_id, action, metadata`), and check the returned error instead
of ignoring it. This aligns code with the schema the migrations define. It is
an application-code change, not a schema or migration change.

Do not apply `20260928090000` to production until production schema truth is
read, because its column grant is only valid against the canonical shape.

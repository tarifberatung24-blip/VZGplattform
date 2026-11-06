-- HORIZON Service Request artifacts: atomic, per-artifact retry idempotency.
--
-- Additive and nullable. Existing rows and user-edited facts are untouched.
-- The keys are supplied only for records owned by the Service Request → Case
-- provisioning workflow; ordinary facts/messages/audit events remain unchanged.
--
-- The uniqueness scope is the owning user plus a stable request-scoped key.
-- This intentionally does NOT constrain (case_id, key) in extracted_facts:
-- the case engine relies on append-only fact history and latest-fact-wins.

alter table public.extracted_facts
  add column if not exists idempotency_key text;

alter table public.case_messages
  add column if not exists idempotency_key text;

alter table public.audit_events
  add column if not exists idempotency_key text;

-- Nullable unique keys preserve all existing records (multiple NULL values are
-- permitted) while making each provisioning artifact an atomic insert.
create unique index if not exists extracted_facts_owner_idempotency_key_uniq
  on public.extracted_facts (owner_id, idempotency_key);

create unique index if not exists case_messages_owner_idempotency_key_uniq
  on public.case_messages (owner_id, idempotency_key);

create unique index if not exists audit_events_actor_idempotency_key_uniq
  on public.audit_events (actor_id, idempotency_key);

-- Session-scoped writes use the authenticated user and the existing RLS policies.
-- Add only the new column to the established insert grants.
grant insert (idempotency_key) on public.extracted_facts to authenticated;
grant insert (idempotency_key) on public.case_messages to authenticated;
grant insert (idempotency_key) on public.audit_events to authenticated;

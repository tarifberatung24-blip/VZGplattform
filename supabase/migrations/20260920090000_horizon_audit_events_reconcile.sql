-- HORIZON reconciliation: audit_events existence and canonical base policies.
--
-- Production finding: `public.audit_events` was missing in the live project even
-- though the earlier baseline migration was recorded as applied. The production
-- reconciliation recreated it with the canonical owner-scoped schema. This
-- migration brings the repository into line so a fresh environment converges on
-- the same state.
--
-- Idempotent and additive: `create table if not exists` plus guarded constraint,
-- index, trigger, and policy creation. Nothing is dropped, no existing policy is
-- replaced, and no row is rewritten.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- The constraint is added separately so the table can be created here even when
-- it already exists (where `create table if not exists` is a no-op and would
-- otherwise skip the inline definition).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'audit_events_metadata_object'
  ) then
    alter table public.audit_events
      add constraint audit_events_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
end;
$$;

alter table public.audit_events enable row level security;

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;

-- Base read policy, owner-scoped. Created only when absent so an existing
-- production policy is never replaced or weakened.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_events'
      and policyname = 'audit_events_read_own'
  ) then
    create policy audit_events_read_own on public.audit_events
      for select to authenticated
      using ((select auth.uid()) = actor_id);
  end if;
end;
$$;

create index if not exists audit_events_actor_id_idx on public.audit_events(actor_id);
create index if not exists audit_events_case_idx on public.audit_events(case_id, actor_id);

-- The self-referencing FK to cases(id, owner_id) is what makes forging an audit
-- event onto another user's case impossible, so it must exist wherever the table
-- does. Guarded because the table may predate the compound key.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'audit_events_case_owner_fk'
  ) then
    alter table public.audit_events
      add constraint audit_events_case_owner_fk
      foreign key (case_id, actor_id) references public.cases(id, owner_id) on delete cascade;
  end if;
end;
$$;
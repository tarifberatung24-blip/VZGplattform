-- HORIZON Agent Runs Engine — PREPARED ONLY. NOT APPLIED.
--
-- This file lives in supabase/prepared/ on purpose. README.md documents that
-- directory as SQL "that are not applied by the normal migration flow", and
-- both governance blueprints gate this schema on an explicit owner approval:
--   docs/HORIZON_ALPHA_TEAM_BLUEPRINT_BG.md §C:
--     "Добавяне на additive persistence за `agent_runs`/`agent_steps` само след
--      одобрение на schema/RLS промяната."
--   docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md §7:
--     "изискват отделно одобрение за schema/RLS"
-- Do not move this file into supabase/migrations/ and do not run it until the
-- owner approves the schema/RLS change. Validate on a disposable project first
-- with supabase/tests/rls/horizon_agent_runs_engine_isolation.sql.
--
-- WHAT THIS IS
-- Additive persistence for durable agent runs: one run, its ordered steps, and a
-- bounded event outbox. It introduces no second source of truth — every run and
-- step references existing HORIZON entities by id (case, service request,
-- document, draft). It duplicates no case, document, fact or audit data.
--
-- WHY THERE IS NO SERVICE-ROLE GRANT
-- docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md §4: "Ако бъде добавен истински
-- agent worker, той трябва да пише през каноничния helper, под проверено owner/RLS
-- правило; не се добавя service-role bypass." The dispatcher model is therefore an
-- owner decision. Until it is made, only owner-scoped `authenticated` access is
-- granted. If the owner later approves a service-role dispatcher, that is a
-- separate, explicitly approved change to this file.

-- ---------------------------------------------------------------------------
-- agent_runs — one durable run.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- References to existing HORIZON entities. No content is duplicated.
  case_id uuid,
  service_request_id text,
  -- One trace per run; the client never supplies the trace id.
  trace_id uuid not null default gen_random_uuid(),
  status text not null default 'queued'
    check (status in (
      'queued','running','paused','awaiting_approval','completed',
      'failed','cancelled','dead_letter'
    )),
  objective text not null check (char_length(objective) between 1 and 2000),
  lead_agent text not null check (char_length(lead_agent) between 1 and 80),
  -- Client-supplied dedup key. The unique index below is the atomic guarantee,
  -- matching the pattern already used for cases(owner_id, service_request_id).
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  prompt_version text,
  model_version text,
  skill_version text,
  -- JSON arrays of references (ids/paths), never document content or prompts.
  input_references jsonb not null default '[]'::jsonb
    check (jsonb_typeof(input_references) = 'array'),
  output_references jsonb not null default '[]'::jsonb
    check (jsonb_typeof(output_references) = 'array'),
  error_code text,
  -- Safe, non-sensitive message only. Never a stack trace, prompt or document text.
  error_message_safe text,
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Duplicate run creation is refused by the database, not only in application code.
  constraint agent_runs_owner_idempotency_key unique (owner_id, idempotency_key),
  -- One run per trace, so trace correlation cannot be spoofed by a second run.
  constraint agent_runs_owner_trace_id unique (owner_id, trace_id),
  -- Required by the composite FKs below: Postgres needs a unique constraint on
  -- exactly (id, owner_id) before another table can reference that pair.
  constraint agent_runs_id_owner unique (id, owner_id),
  -- Composite FK to cases(id, owner_id): binding a run to another owner's case is
  -- impossible in the database. Same technique as audit_events_case_owner_fk.
  constraint agent_runs_case_owner_fk
    foreign key (case_id, owner_id) references public.cases(id, owner_id) on delete cascade
);

comment on table public.agent_runs is
  'HORIZON Agent Runs Engine: durable run state. References existing case/service-request entities; duplicates no case, document, fact or audit data.';
comment on column public.agent_runs.error_message_safe is
  'Non-sensitive failure summary only. Never a stack trace, prompt, document text or secret.';
comment on column public.agent_runs.idempotency_key is
  'Client-supplied dedup key; the unique (owner_id, idempotency_key) constraint is the atomic duplicate-run guarantee.';

create index if not exists agent_runs_owner_created_idx
  on public.agent_runs(owner_id, created_at desc);
create index if not exists agent_runs_owner_status_idx
  on public.agent_runs(owner_id, status);
create index if not exists agent_runs_case_idx
  on public.agent_runs(case_id, owner_id);
-- Worker claim path: only runs that are due are considered.
create index if not exists agent_runs_due_idx
  on public.agent_runs(next_attempt_at)
  where status in ('queued','running') and next_attempt_at is not null;

-- ---------------------------------------------------------------------------
-- agent_steps — ordered, attempt-aware steps of a run.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  step_key text not null check (char_length(step_key) between 1 and 120),
  agent_id text not null check (char_length(agent_id) between 1 and 80),
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed','skipped','dead_letter')),
  -- A retry is a new attempt; history is never overwritten.
  attempt integer not null default 1 check (attempt >= 1),
  input_reference jsonb not null default '{}'::jsonb
    check (jsonb_typeof(input_reference) = 'object'),
  output_reference jsonb not null default '{}'::jsonb
    check (jsonb_typeof(output_reference) = 'object'),
  error_code text,
  error_message_safe text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per (run, step, attempt): retries append, they do not overwrite.
  constraint agent_steps_run_step_attempt unique (run_id, step_key, attempt),
  -- A step cannot claim a run owned by someone else.
  constraint agent_steps_run_owner_fk
    foreign key (run_id, owner_id) references public.agent_runs(id, owner_id) on delete cascade
);

comment on table public.agent_steps is
  'HORIZON Agent Runs Engine: per-step execution state. Each retry is a new attempt row, so step history is append-only.';

create index if not exists agent_steps_run_idx
  on public.agent_steps(run_id, attempt);
create index if not exists agent_steps_owner_status_idx
  on public.agent_steps(owner_id, status);

-- ---------------------------------------------------------------------------
-- agent_run_events — bounded event outbox / queue.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_run_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid,
  event_type text not null
    check (event_type in (
      'SERVICE_REQUEST_CREATED','DOCUMENT_READY','CASE_UPDATED',
      'DEADLINE_APPROACHING','USER_APPROVAL_GRANTED','USER_APPROVAL_REJECTED'
    )),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  -- Event payload holds references and safe scalars, never document content.
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  -- 'dead_letter' is the terminal failure state required by the brief.
  status text not null default 'received'
    check (status in ('received','processing','processed','dead_letter')),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  -- When the event becomes eligible; the worker orders by this and backs off here.
  available_at timestamptz not null default now(),
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Duplicate event delivery is refused by the database.
  constraint agent_run_events_owner_idempotency_key unique (owner_id, idempotency_key),
  constraint agent_run_events_run_owner_fk
    foreign key (run_id, owner_id) references public.agent_runs(id, owner_id) on delete cascade
);

comment on table public.agent_run_events is
  'HORIZON Agent Runs Engine: bounded event outbox. Duplicate delivery is refused by the unique (owner_id, idempotency_key) constraint; terminal failure is status = dead_letter.';

create index if not exists agent_run_events_owner_created_idx
  on public.agent_run_events(owner_id, created_at desc);
-- Worker claim path: the next due, unprocessed event. Paired with SELECT … FOR
-- UPDATE SKIP LOCKED at the application layer.
create index if not exists agent_run_events_claim_idx
  on public.agent_run_events(status, available_at)
  where status in ('received','processing');
create index if not exists agent_run_events_run_idx
  on public.agent_run_events(run_id, owner_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance. Same trigger pattern the repository already uses
-- (20261011120000_user_notifications.sql and others).
-- ---------------------------------------------------------------------------
create or replace function public.agent_runs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers are created only when absent. No trigger is dropped, so the migration
-- is additive and safe to re-run without a window in which updated_at is unset.
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('agent_runs',       'agent_runs_touch_updated_at'),
      ('agent_steps',      'agent_steps_touch_updated_at'),
      ('agent_run_events', 'agent_run_events_touch_updated_at')
    ) as t(table_name, trigger_name)
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = target.trigger_name
        and tgrelid = format('public.%I', target.table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.agent_runs_touch_updated_at()',
        target.trigger_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: enabled, owner-scoped, no delete policy, no anon access.
-- ---------------------------------------------------------------------------
alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.agent_run_events enable row level security;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('agent_runs',        'agent_runs_owner_select'),
      ('agent_steps',       'agent_steps_owner_select'),
      ('agent_run_events',  'agent_run_events_owner_select')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('agent_runs',        'agent_runs_owner_insert'),
      ('agent_steps',       'agent_steps_owner_insert'),
      ('agent_run_events',  'agent_run_events_owner_insert')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('agent_runs',        'agent_runs_owner_update'),
      ('agent_steps',       'agent_steps_owner_update'),
      ('agent_run_events',  'agent_run_events_owner_update')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

-- Grants: column-scoped only, no table-wide grant, no anon, no service_role.
-- The owner is always taken from the session, never from the client.
revoke all on table public.agent_runs from anon;
revoke all on table public.agent_runs from authenticated;
revoke all on table public.agent_steps from anon;
revoke all on table public.agent_steps from authenticated;
revoke all on table public.agent_run_events from anon;
revoke all on table public.agent_run_events from authenticated;

grant select on table public.agent_runs to authenticated;
grant insert (owner_id, case_id, service_request_id, trace_id, objective, lead_agent,
              idempotency_key, prompt_version, model_version, skill_version,
              input_references)
  on public.agent_runs to authenticated;
grant update (status, output_references, error_code, error_message_safe, attempt,
              next_attempt_at, started_at, completed_at)
  on public.agent_runs to authenticated;

grant select on table public.agent_steps to authenticated;
grant insert (run_id, owner_id, step_key, agent_id, status, attempt, input_reference)
  on public.agent_steps to authenticated;
grant update (status, output_reference, error_code, error_message_safe,
              started_at, completed_at)
  on public.agent_steps to authenticated;

grant select on table public.agent_run_events to authenticated;
grant insert (owner_id, run_id, event_type, idempotency_key, payload, available_at)
  on public.agent_run_events to authenticated;
grant update (status, attempt, available_at, last_error_code, processed_at)
  on public.agent_run_events to authenticated;

-- EXPLICITLY NOT DONE
-- * No delete policy and no delete grant: deletion cascades from cases/auth.users,
--   matching the canonical case spine.
-- * No service-role grant: docs/HORIZON_AGENT_SAFETY_KNOWLEDGE_BLUEPRINT.md §4
--   forbids an agent-worker service-role bypass. A dispatcher model is an owner
--   decision and would be a separate approved change.
-- * No existing table, policy, grant or row is altered, dropped or rewritten.
-- * No audit table: lifecycle transitions reuse the existing audit_events spine.

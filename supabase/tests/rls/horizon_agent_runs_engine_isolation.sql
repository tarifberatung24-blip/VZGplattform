-- HORIZON Agent Runs Engine: ownership isolation and idempotency.
--
-- Runs only against a disposable local/staging database after
-- applying:
--   1. supabase/migrations/20260909112037_kintex_assistant_baseline.sql
--   2. supabase/migrations/20260919150000_horizon_case_engine.sql
--   3. supabase/migrations/20261107000000_horizon_agent_runs_engine.sql
-- Never run against the production project. The transaction always rolls back
-- its synthetic fixtures, so it leaves no rows behind.
--
-- This file proves database-level behaviour only. It is NOT a substitute for the
-- unit/contract tests; it is the real-database check the unit tests cannot make.
-- If it cannot be run, it is reported as not executed, not as passing.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'a0000000-0000-4000-8000-00000000000a',
    'horizon-runs-a@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'b0000000-0000-4000-8000-00000000000b',
    'horizon-runs-b@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

-- Cases are needed so the composite FK on agent_runs can be exercised.
insert into public.cases (id, owner_id, title, intent, horizon_status, horizon_module)
values
  ('a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-00000000000a',
   'Runs Case A', 'reply', 'collecting_data', 'kuendigung'),
  ('b0000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-00000000000b',
   'Runs Case B', 'reply', 'collecting_data', 'kuendigung');

-- Fixtures are inserted as the table owner so RLS is not a factor here; every
-- assertion below runs as `authenticated`.
insert into public.agent_runs (
  id, owner_id, case_id, objective, lead_agent, idempotency_key, status
)
values
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1', 'Run A objective', 'finance-tax', 'run-a-1', 'running'),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2', 'Run B objective', 'finance-tax', 'run-b-1', 'running');

insert into public.agent_steps (id, run_id, owner_id, step_key, agent_id, status, attempt)
values
  ('a0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-0000000000a1',
   'a0000000-0000-4000-8000-00000000000a', 'plan', 'finance-tax', 'completed', 1),
  ('b0000000-0000-4000-8000-0000000000d2', 'b0000000-0000-4000-8000-0000000000b1',
   'b0000000-0000-4000-8000-00000000000b', 'plan', 'finance-tax', 'completed', 1);

insert into public.agent_run_events (
  id, owner_id, run_id, event_type, idempotency_key, status
)
values
  ('a0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000a1', 'SERVICE_REQUEST_CREATED', 'evt-a-1', 'received'),
  ('b0000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000b1', 'SERVICE_REQUEST_CREATED', 'evt-b-1', 'received');

-- ---------------------------------------------------------------------------
-- Customer A must see exactly their own row in every new table.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from public.agent_runs;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % runs, expected 1', n; end if;

  select count(*) into n from public.agent_steps;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % steps, expected 1', n; end if;

  select count(*) into n from public.agent_run_events;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % events, expected 1', n; end if;
end;
$$;

-- A must not read B's rows by primary key.
do $$
begin
  if exists (select 1 from public.agent_runs where id = 'b0000000-0000-4000-8000-0000000000b1') then
    raise exception 'RLS_TEST_FAILED: A read B run by id';
  end if;
  if exists (select 1 from public.agent_steps where id = 'b0000000-0000-4000-8000-0000000000d2') then
    raise exception 'RLS_TEST_FAILED: A read B step by id';
  end if;
  if exists (select 1 from public.agent_run_events where id = 'b0000000-0000-4000-8000-0000000000e2') then
    raise exception 'RLS_TEST_FAILED: A read B event by id';
  end if;
end;
$$;

-- A must not modify B's run: the UPDATE policy's USING clause hides the row.
do $$
declare
  changed integer;
begin
  update public.agent_runs set status = 'cancelled'
   where id = 'b0000000-0000-4000-8000-0000000000b1';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'RLS_TEST_FAILED: A modified B run (% rows)', changed;
  end if;
end;
$$;

-- A must not bind a run to B's case, nor insert as B.
do $$
begin
  begin
    insert into public.agent_runs (owner_id, case_id, objective, lead_agent, idempotency_key)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 'cross-case run', 'finance-tax', 'run-a-cross');
    raise exception 'RLS_TEST_FAILED: A bound a run to B case';
  exception
    when foreign_key_violation then null;  -- expected: composite FK refuses it
    when insufficient_privilege then null; -- expected: WITH CHECK refuses it
  end;

  begin
    insert into public.agent_runs (owner_id, case_id, objective, lead_agent, idempotency_key)
    values ('b0000000-0000-4000-8000-00000000000b',
            'b0000000-0000-4000-8000-0000000000c2', 'spoofed owner', 'finance-tax', 'run-a-spoof');
    raise exception 'RLS_TEST_FAILED: A inserted a run as B';
  exception
    when insufficient_privilege then null; -- expected: WITH CHECK refuses it
  end;
end;
$$;

-- Duplicate run creation is refused by the unique constraint, not by application code.
do $$
begin
  begin
    insert into public.agent_runs (owner_id, case_id, objective, lead_agent, idempotency_key)
    values ('a0000000-0000-4000-8000-00000000000a',
            'a0000000-0000-4000-8000-0000000000c1', 'dup run', 'finance-tax', 'run-a-1');
    raise exception 'RLS_TEST_FAILED: duplicate run idempotency key was accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- Duplicate event delivery is refused by the unique constraint.
do $$
begin
  begin
    insert into public.agent_run_events (owner_id, run_id, event_type, idempotency_key)
    values ('a0000000-0000-4000-8000-00000000000a',
            'a0000000-0000-4000-8000-0000000000a1', 'DOCUMENT_READY', 'evt-a-1');
    raise exception 'RLS_TEST_FAILED: duplicate event idempotency key was accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- An invalid event type is rejected by the CHECK constraint.
do $$
begin
  begin
    insert into public.agent_run_events (owner_id, run_id, event_type, idempotency_key)
    values ('a0000000-0000-4000-8000-00000000000a',
            'a0000000-0000-4000-8000-0000000000a1', 'NOT_A_REAL_EVENT', 'evt-a-bad');
    raise exception 'RLS_TEST_FAILED: invalid event type was accepted';
  exception
    when check_violation then null; -- expected
  end;
end;
$$;

-- A retry appends a new attempt row and does not overwrite the previous one.
do $$
begin
  insert into public.agent_steps (run_id, owner_id, step_key, agent_id, status, attempt)
  values ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a',
          'plan', 'finance-tax', 'failed', 2);

  begin
    insert into public.agent_steps (run_id, owner_id, step_key, agent_id, status, attempt)
    values ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a',
            'plan', 'finance-tax', 'failed', 2);
    raise exception 'RLS_TEST_FAILED: duplicate (run, step, attempt) was accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anonymous access must be denied outright.
-- ---------------------------------------------------------------------------
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.agent_runs limit 1;
    raise exception 'RLS_TEST_FAILED: anon read agent_runs';
  exception
    when insufficient_privilege then null; -- expected
  end;
  begin
    perform 1 from public.agent_steps limit 1;
    raise exception 'RLS_TEST_FAILED: anon read agent_steps';
  exception
    when insufficient_privilege then null; -- expected
  end;
  begin
    perform 1 from public.agent_run_events limit 1;
    raise exception 'RLS_TEST_FAILED: anon read agent_run_events';
  exception
    when insufficient_privilege then null; -- expected
  end;
end;
$$;

rollback;

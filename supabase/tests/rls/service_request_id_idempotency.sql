-- HORIZON Service Request → Case: DB-level idempotency.
--
-- Run only against a disposable local/staging database after applying:
--   1. supabase/migrations/20260909112037_kintex_assistant_baseline.sql
--   2. supabase/migrations/20260919150000_horizon_case_engine.sql
--   3. supabase/migrations/20260920090100_horizon_case_engine_rls_policies.sql
--   4. supabase/migrations/20261105120000_service_request_id_idempotency.sql
-- The transaction always rolls back its synthetic fixtures.
--
-- Covers the atomic guarantee the Service Request → Case workflow depends on:
-- one case per (owner, service_request_id), enforced by the partial unique index.

begin;

-- ---------------------------------------------------------------------------
-- PRE-FLIGHT (read-only). This is the query the migration runs before creating
-- the index. It MUST return 0 rows, otherwise the index creation would fail and
-- the duplicates must be resolved by the owner first. Nothing here mutates data.
-- ---------------------------------------------------------------------------
do $$
declare
  dup_pairs integer;
begin
  select count(*) into dup_pairs from (
    select owner_id, service_request_id
    from public.cases
    where service_request_id is not null
    group by owner_id, service_request_id
    having count(*) > 1
  ) d;
  -- Reported for the operator; the migration raises on a non-zero count.
  raise notice 'service_request_id pre-flight: % duplicate (owner, request) pair(s)', dup_pairs;
end $$;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'c0000000-0000-4000-8000-00000000000c',
    'hz-idem-c@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

-- ---------------------------------------------------------------------------
-- The partial unique index admits exactly one case per (owner, request id).
-- ---------------------------------------------------------------------------
do $$
begin
  insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'first', 'application', 'draft', 'general', 'hz_idem_1');

  begin
    insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
    values ('c0000000-0000-4000-8000-00000000000c', 'second', 'application', 'draft', 'general', 'hz_idem_1');
    raise exception 'IDEMPOTENCY_TEST_FAILED: a second case for the same (owner, request id) was accepted';
  exception
    when unique_violation then
      null; -- expected: the index rejected the duplicate
  end;

  -- A different request id is a different case: the index must not over-block.
  insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'third', 'application', 'draft', 'general', 'hz_idem_2');

  -- NULL request ids are outside the partial index, so many plain cases coexist.
  insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'plain-1', 'reply', 'draft', 'general', null);
  insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'plain-2', 'reply', 'draft', 'general', null);

  if (select count(*) from public.cases
      where owner_id = 'c0000000-0000-4000-8000-00000000000c'
        and service_request_id is null) <> 2 then
    raise exception 'IDEMPOTENCY_TEST_FAILED: null request ids were incorrectly constrained';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The guarantee is owner-scoped: two different owners may reuse the same string.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'd0000000-0000-4000-8000-00000000000d',
    'hz-idem-d@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
values ('d0000000-0000-4000-8000-00000000000d', 'other owner', 'application', 'draft', 'general', 'hz_idem_1');

-- ---------------------------------------------------------------------------
-- The session role may set the idempotency column (the grant the engine needs).
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-00000000000c","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  insert into public.cases (owner_id, title, intent, horizon_status, horizon_module, service_request_id)
  values ('c0000000-0000-4000-8000-00000000000c', 'granted', 'application', 'draft', 'general', 'hz_idem_granted');
exception
  when insufficient_privilege then
    raise exception 'IDEMPOTENCY_TEST_FAILED: authenticated lacks insert on cases.service_request_id';
end $$;

reset role;

rollback;

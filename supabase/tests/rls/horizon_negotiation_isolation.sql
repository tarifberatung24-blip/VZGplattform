-- HORIZON NEGOTIATION ENGINE: two-customer ownership isolation.
--
-- Run only against a disposable local/staging database, after applying:
--   1. supabase/tests/rls/_supabase_compat_prelude.sql   (local harness only)
--   2. supabase/baseline/kintexbg_b2c_v1.sql
--   3. supabase/migrations/20260926090000_horizon_negotiation_engine.sql
-- See docs/HORIZON_NEGOTIATION_ENGINE.md for the exact command.
--
-- The transaction always rolls back its synthetic fixtures. Two authenticated
-- customers are created; every assertion is made while the session role is
-- `authenticated` with a request-scoped `sub` claim, so row level security is
-- genuinely in force rather than bypassed by a superuser connection.

begin;

-- ---------------------------------------------------------------------------
-- Fixtures. Inserted before the role switch, so both customers' rows exist and
-- the assertions below can prove each customer sees only their own.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'negotiation-rls-a@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'negotiation-rls-b@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.households (id, owner_id, name)
values
  ('a1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000001', 'Negotiation A'),
  ('b2000000-0000-4000-8000-000000000022', 'b2000000-0000-4000-8000-000000000002', 'Negotiation B');

insert into public.contracts (id, household_id, category, title, provider_name)
values
  ('a1000000-0000-4000-8000-000000001111', 'a1000000-0000-4000-8000-000000000011', 'internet', 'Contract A', 'Provider A'),
  ('b2000000-0000-4000-8000-000000002222', 'b2000000-0000-4000-8000-000000000022', 'mobile', 'Contract B', 'Provider B');

insert into public.negotiation_sessions (
  id, owner_id, household_id, contract_id, category, state, decision_action
)
values
  (
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000001111',
    'internet', 'NEGOTIATION', 'NEGOTIATE'
  ),
  (
    'b2000000-0000-4000-8000-00000000bb02',
    'b2000000-0000-4000-8000-000000000002',
    'b2000000-0000-4000-8000-000000000022',
    'b2000000-0000-4000-8000-000000002222',
    'mobile', 'NEGOTIATION', 'NEGOTIATE'
  ),
  -- B-owned, deliberately childless: the cross-tenant attach probes below target
  -- this session so the composite foreign key is what refuses them, rather than a
  -- per-session uniqueness constraint on a table that already has a child row.
  (
    'b2000000-0000-4000-8000-00000000bb03',
    'b2000000-0000-4000-8000-000000000002',
    'b2000000-0000-4000-8000-000000000022',
    'b2000000-0000-4000-8000-000000002222',
    'mobile', 'NEGOTIATION', 'NEGOTIATE'
  );

insert into public.negotiation_preferences (owner_id, session_id, must_keep, min_monthly_saving)
values
  ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000aa01', '["same_speed"]'::jsonb, 5),
  ('b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-00000000bb02', '["same_data"]'::jsonb, 3);

insert into public.negotiation_offers (
  owner_id, session_id, origin, source, content, content_hash, parsed_facts
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-00000000aa01',
    'provider', 'user_paste', '{"text":"A offer"}'::jsonb, 'hash-a', '{"newMonthly":34.99}'::jsonb
  ),
  (
    'b2000000-0000-4000-8000-000000000002',
    'b2000000-0000-4000-8000-00000000bb02',
    'provider', 'user_paste', '{"text":"B offer"}'::jsonb, 'hash-b', '{"newMonthly":19.99}'::jsonb
  );

insert into public.negotiation_authorizations (owner_id, session_id, scope, status)
values
  ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000aa01', 'A scope', 'granted'),
  ('b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-00000000bb02', 'B scope', 'granted');

insert into public.negotiation_verifications (owner_id, session_id, expected, result)
values
  ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000aa01', '{"monthlyCost":34.99}'::jsonb, 'pending'),
  ('b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-00000000bb02', '{"monthlyCost":19.99}'::jsonb, 'pending');

insert into public.negotiation_events (owner_id, session_id, event_type, detail)
values
  ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000aa01', 'started', '{"fixture":"a"}'::jsonb),
  ('b2000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-00000000bb02', 'started', '{"fixture":"b"}'::jsonb);

-- ---------------------------------------------------------------------------
-- Customer A: reads only A's rows across all six tables.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  visible integer;
begin
  -- SELECT isolation, one assertion per negotiation table.
  select count(*) into visible from public.negotiation_sessions;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_session, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_preferences;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_preference, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_offers;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_offer, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_authorizations;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_authorization, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_verifications;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_verification, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_events;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: A must see exactly 1 negotiation_event, saw %', visible;
  end if;

  -- A must not be able to address B's rows by primary key either: a direct id
  -- lookup is the obvious way to try to bypass a list-level filter.
  select count(*) into visible
  from public.negotiation_sessions
  where id = 'b2000000-0000-4000-8000-00000000bb02';
  if visible <> 0 then
    raise exception 'RLS_TEST_FAILED: A read B negotiation_session by id';
  end if;

  select count(*) into visible
  from public.negotiation_offers
  where session_id = 'b2000000-0000-4000-8000-00000000bb02';
  if visible <> 0 then
    raise exception 'RLS_TEST_FAILED: A read B negotiation_offers by session id';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer A: may write A's rows, may not write B's.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Own writes succeed.
  insert into public.negotiation_events (owner_id, session_id, event_type, detail)
  values (
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-00000000aa01',
    'strategy_created', '{"fixture":"a2"}'::jsonb
  );

  insert into public.negotiation_sessions (
    owner_id, household_id, contract_id, category, state
  )
  values (
    'a1000000-0000-4000-8000-000000000001',
    'a1000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000001111',
    'internet', 'CONTRACT'
  );

  -- Writing a row owned by B is refused by the WITH CHECK clause.
  begin
    insert into public.negotiation_events (owner_id, session_id, event_type, detail)
    values (
      'b2000000-0000-4000-8000-000000000002',
      'b2000000-0000-4000-8000-00000000bb02',
      'started', '{"forbidden":true}'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: A inserted a negotiation_event owned by B';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.negotiation_sessions (
      owner_id, household_id, contract_id, category, state
    )
    values (
      'b2000000-0000-4000-8000-000000000002',
      'b2000000-0000-4000-8000-000000000022',
      'b2000000-0000-4000-8000-000000002222',
      'mobile', 'CONTRACT'
    );
    raise exception 'RLS_TEST_FAILED: A inserted a negotiation_session owned by B';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.negotiation_offers (
      owner_id, session_id, origin, source, content, content_hash, parsed_facts
    )
    values (
      'b2000000-0000-4000-8000-000000000002',
      'b2000000-0000-4000-8000-00000000bb02',
      'provider', 'user_paste', '{"text":"x"}'::jsonb, 'hash-x', '{}'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: A inserted a negotiation_offer owned by B';
  exception when insufficient_privilege then
    null;
  end;

  -- A may not update or delete B's rows. RLS makes them invisible, so the
  -- statement affects zero rows rather than raising.
  update public.negotiation_sessions
  set state = 'CONFIRMED'
  where id = 'b2000000-0000-4000-8000-00000000bb02';
  if found then
    raise exception 'RLS_TEST_FAILED: A updated B negotiation_session';
  end if;

  -- A holds no DELETE privilege on the timeline at all. The privilege check
  -- fires before row filtering, so neither B's rows nor A's own can be erased.
  begin
    delete from public.negotiation_events
    where session_id = 'b2000000-0000-4000-8000-00000000bb02';
    raise exception 'RLS_TEST_FAILED: A deleted B negotiation_events';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.negotiation_events
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A deleted its own negotiation_event';
  exception when insufficient_privilege then
    null;
  end;

  -- A may not reparent B's offer into A's session.
  begin
    update public.negotiation_offers
    set session_id = 'a1000000-0000-4000-8000-00000000aa01'
    where session_id = 'b2000000-0000-4000-8000-00000000bb02';
    if found then
      raise exception 'RLS_TEST_FAILED: A reparented B negotiation_offer';
    end if;
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cross-household foreign IDs. A session must not be creatable against another
-- customer's contract or household, even though the new row is owned by A.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.negotiation_sessions (
      owner_id, household_id, contract_id, category, state
    )
    values (
      'a1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000011',
      'b2000000-0000-4000-8000-000000002222',
      'mobile', 'CONTRACT'
    );
    raise exception 'RLS_TEST_FAILED: A linked a negotiation_session to B contract';
  exception when insufficient_privilege or foreign_key_violation then
    null;
  end;

  begin
    insert into public.negotiation_sessions (
      owner_id, household_id, contract_id, category, state
    )
    values (
      'a1000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-000000000022',
      'a1000000-0000-4000-8000-000000001111',
      'internet', 'CONTRACT'
    );
    raise exception 'RLS_TEST_FAILED: A linked a negotiation_session to B household';
  exception when insufficient_privilege or foreign_key_violation then
    null;
  end;

  -- A child row may not be attached to B's session, whichever table it is.
  begin
    insert into public.negotiation_preferences (owner_id, session_id, must_keep)
    values (
      'a1000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-00000000bb03',
      '[]'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: A attached negotiation_preferences to B session';
  exception when insufficient_privilege or foreign_key_violation then
    null;
  end;

  begin
    insert into public.negotiation_verifications (owner_id, session_id, expected)
    values (
      'a1000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-00000000bb03',
      '{}'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: A attached negotiation_verifications to B session';
  exception when insufficient_privilege or foreign_key_violation then
    null;
  end;

  begin
    insert into public.negotiation_authorizations (owner_id, session_id, scope)
    values (
      'a1000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-00000000bb03',
      'forbidden'
    );
    raise exception 'RLS_TEST_FAILED: A attached negotiation_authorizations to B session';
  exception when insufficient_privilege or foreign_key_violation then
    null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- negotiation_events is append-only through the session client.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    update public.negotiation_events
    set detail = '{"tampered":true}'::jsonb
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A updated its own negotiation_event';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.negotiation_events
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A deleted its own negotiation_event';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offer content is immutable once stored, so an approval hash cannot be bound to
-- content that was never reviewed.
-- ---------------------------------------------------------------------------
do $$
begin
  -- The column grant omits content and content_hash, so the privilege check
  -- refuses the write before the immutability trigger is even reached.
  begin
    update public.negotiation_offers
    set content_hash = 'rewritten'
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A rewrote its own negotiation_offer content hash';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.negotiation_offers
    set content = '{"text":"rewritten"}'::jsonb
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A rewrote its own negotiation_offer content';
  exception when insufficient_privilege then
    null;
  end;

  -- Status is grantable, so the immutability trigger is the second line of
  -- defence; it must not permit a content rewrite smuggled in with it.
  begin
    update public.negotiation_offers
    set status = 'accepted', content_hash = 'rewritten'
    where session_id = 'a1000000-0000-4000-8000-00000000aa01';
    raise exception 'RLS_TEST_FAILED: A rewrote negotiation_offer content via a status update';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Customer B: the mirror image. B sees only B's rows and cannot reach A's.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b2000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  visible integer;
begin
  select count(*) into visible from public.negotiation_sessions;
  if visible <> 2 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 2 negotiation_sessions, saw %', visible;
  end if;

  select count(*) into visible
  from public.negotiation_sessions
  where id = 'a1000000-0000-4000-8000-00000000aa01';
  if visible <> 0 then
    raise exception 'RLS_TEST_FAILED: B read A negotiation_session by id';
  end if;

  select count(*) into visible from public.negotiation_events;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 1 negotiation_event, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_offers;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 1 negotiation_offer, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_preferences;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 1 negotiation_preference, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_authorizations;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 1 negotiation_authorization, saw %', visible;
  end if;

  select count(*) into visible from public.negotiation_verifications;
  if visible <> 1 then
    raise exception 'RLS_TEST_FAILED: B must see exactly 1 negotiation_verification, saw %', visible;
  end if;

  begin
    insert into public.negotiation_events (owner_id, session_id, event_type)
    values (
      'a1000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-00000000aa01',
      'started'
    );
    raise exception 'RLS_TEST_FAILED: B inserted a negotiation_event owned by A';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Anonymous clients hold no privilege on any negotiation table.
-- ---------------------------------------------------------------------------
set local role anon;
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'negotiation_sessions', 'negotiation_preferences', 'negotiation_offers',
    'negotiation_authorizations', 'negotiation_verifications', 'negotiation_events'
  ] loop
    begin
      execute format('select count(*) from public.%I', table_name);
      raise exception 'RLS_TEST_FAILED: anon retained access to %', table_name;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end;
$$;
reset role;

rollback;

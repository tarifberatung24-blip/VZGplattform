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

-- ---------------------------------------------------------------------------
-- Atomic handoff reservation and status application (as customer A).
--
-- The concurrency guarantee is a compare-and-set inside the function; these
-- assertions drive every branch sequentially, which a single connection can do
-- deterministically, and prove the owner filter and RLS still bind through the
-- function (it is `security invoker`).
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
  v_request_id text;
  v_deliver boolean;
  v_status text;
  v_reason text;
  v_applied boolean;
  v_store text;
  v_delivery text;
  v_events integer;
begin
  -- A fresh reservation wins and is told to deliver.
  select r.request_id, r.deliver, r.status, r.reason
    into v_request_id, v_deliver, v_status, v_reason
    from public.reserve_negotiation_handoff(
      'a1000000-0000-4000-8000-00000000aa01',
      'a1000000-0000-4000-8000-000000000001',
      'hzn_rls_1'
    ) r;
  if v_request_id <> 'hzn_rls_1' or not v_deliver or v_reason <> 'reserved' then
    raise exception 'RLS_TEST_FAILED: reserve did not win (% / % / %)', v_request_id, v_deliver, v_reason;
  end if;

  select mode_b_request_id, mode_b_status, mode_b_delivery_status
    into v_store, v_status, v_delivery
    from public.negotiation_sessions
   where id = 'a1000000-0000-4000-8000-00000000aa01';
  if v_store <> 'hzn_rls_1' or v_status <> 'QUEUED' or v_delivery <> 'IN_FLIGHT' then
    raise exception 'RLS_TEST_FAILED: reservation not persisted (% / % / %)', v_store, v_status, v_delivery;
  end if;

  -- A second reserve while the first is in flight loses: same id, no deliver.
  select r.request_id, r.deliver, r.reason
    into v_request_id, v_deliver, v_reason
    from public.reserve_negotiation_handoff(
      'a1000000-0000-4000-8000-00000000aa01',
      'a1000000-0000-4000-8000-000000000001',
      'hzn_rls_2'
    ) r;
  if v_request_id <> 'hzn_rls_1' or v_deliver or v_reason <> 'in_flight' then
    raise exception 'RLS_TEST_FAILED: concurrent reserve was not refused (% / % / %)', v_request_id, v_deliver, v_reason;
  end if;

  -- A failed delivery may be retried, with the SAME id.
  v_applied := public.finalize_negotiation_handoff_delivery(
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'hzn_rls_1', false
  );
  if not v_applied then
    raise exception 'RLS_TEST_FAILED: finalize(failed) did not match';
  end if;

  select r.request_id, r.deliver, r.reason
    into v_request_id, v_deliver, v_reason
    from public.reserve_negotiation_handoff(
      'a1000000-0000-4000-8000-00000000aa01',
      'a1000000-0000-4000-8000-000000000001',
      'hzn_rls_3'
    ) r;
  if v_request_id <> 'hzn_rls_1' or not v_deliver or v_reason <> 'retry' then
    raise exception 'RLS_TEST_FAILED: retry did not reuse id (% / % / %)', v_request_id, v_deliver, v_reason;
  end if;

  -- Once delivered, the handoff is retired from re-sending.
  perform public.finalize_negotiation_handoff_delivery(
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'hzn_rls_1', true
  );

  select r.request_id, r.deliver, r.reason
    into v_request_id, v_deliver, v_reason
    from public.reserve_negotiation_handoff(
      'a1000000-0000-4000-8000-00000000aa01',
      'a1000000-0000-4000-8000-000000000001',
      'hzn_rls_4'
    ) r;
  if v_request_id <> 'hzn_rls_1' or v_deliver or v_reason <> 'delivered' then
    raise exception 'RLS_TEST_FAILED: delivered handoff was re-sent (% / % / %)', v_request_id, v_deliver, v_reason;
  end if;

  -- A stale finalization (wrong request id) must not touch the row.
  v_applied := public.finalize_negotiation_handoff_delivery(
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'hzn_stale', false
  );
  if v_applied then
    raise exception 'RLS_TEST_FAILED: a stale finalization matched';
  end if;

  -- Cross-tenant: A cannot reserve against B's session, even naming B as the
  -- owner, because RLS hides the row from the invoker.
  select count(*) into v_events
    from public.reserve_negotiation_handoff(
      'b2000000-0000-4000-8000-00000000bb02',
      'b2000000-0000-4000-8000-000000000002',
      'hzn_cross'
    );
  if v_events <> 0 then
    raise exception 'RLS_TEST_FAILED: A reserved a handoff on B session';
  end if;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- The operator callback path, as the service role it actually runs under.
--
-- `apply_negotiation_handoff_status` is execute-granted to service_role only, so
-- it cannot be driven from the customer client. The owner filter inside the
-- function is what scopes it: the route derives the owner from the row it read,
-- so an id/owner mismatch must apply nothing.
-- ---------------------------------------------------------------------------
set local role service_role;

do $$
declare
  v_applied boolean;
  v_events integer;
  v_status text;
begin
  v_applied := public.apply_negotiation_handoff_status(
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'QUEUED', 'IN_PROGRESS'
  );
  if not v_applied then
    raise exception 'RLS_TEST_FAILED: apply from the observed status did not apply';
  end if;

  select mode_b_status into v_status
    from public.negotiation_sessions
   where id = 'a1000000-0000-4000-8000-00000000aa01';
  if v_status <> 'IN_PROGRESS' then
    raise exception 'RLS_TEST_FAILED: apply did not store the status (%)', v_status;
  end if;

  select count(*) into v_events
    from public.negotiation_events
   where session_id = 'a1000000-0000-4000-8000-00000000aa01'
     and event_type = 'operator_status_changed';
  if v_events <> 1 then
    raise exception 'RLS_TEST_FAILED: apply did not write exactly one event (%)', v_events;
  end if;

  -- Re-applying from the same `from` (the concurrent-callback case) matches no
  -- row and writes nothing, so a race cannot append a second move.
  v_applied := public.apply_negotiation_handoff_status(
    'a1000000-0000-4000-8000-00000000aa01',
    'a1000000-0000-4000-8000-000000000001',
    'QUEUED', 'IN_PROGRESS'
  );
  if v_applied then
    raise exception 'RLS_TEST_FAILED: a replayed apply double-applied';
  end if;

  select count(*) into v_events
    from public.negotiation_events
   where session_id = 'a1000000-0000-4000-8000-00000000aa01'
     and event_type = 'operator_status_changed';
  if v_events <> 1 then
    raise exception 'RLS_TEST_FAILED: a replayed apply appended a second event (%)', v_events;
  end if;

  -- Owner mismatch: the row id is A's but the owner passed is B's, so nothing
  -- applies. This is how the route refuses a callback bound to the wrong owner.
  v_applied := public.apply_negotiation_handoff_status(
    'a1000000-0000-4000-8000-00000000aa01',
    'b2000000-0000-4000-8000-000000000002',
    'IN_PROGRESS', 'AWAITING_PROVIDER'
  );
  if v_applied then
    raise exception 'RLS_TEST_FAILED: apply ignored the owner filter';
  end if;
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

-- Owner-scope verification for the claim helpers. Fixtures and the stale-state
-- setup run as the table owner; every assertion runs as `authenticated` user A.
begin;
insert into auth.users (id,email,aud,role) values
 ('a0000000-0000-4000-8000-00000000000a','a@example.invalid','authenticated','authenticated'),
 ('b0000000-0000-4000-8000-00000000000b','b@example.invalid','authenticated','authenticated');
insert into public.cases (id,owner_id,title,intent,horizon_status,horizon_module) values
 ('a0000000-0000-4000-8000-0000000000c1','a0000000-0000-4000-8000-00000000000a','A','reply','collecting_data','kuendigung'),
 ('b0000000-0000-4000-8000-0000000000c2','b0000000-0000-4000-8000-00000000000b','B','reply','collecting_data','kuendigung');
insert into public.agent_runs (id,owner_id,case_id,objective,lead_agent,idempotency_key,status) values
 ('a0000000-0000-4000-8000-0000000000a1','a0000000-0000-4000-8000-00000000000a','a0000000-0000-4000-8000-0000000000c1','A obj','finance-tax','run-a','running'),
 ('b0000000-0000-4000-8000-0000000000b1','b0000000-0000-4000-8000-00000000000b','b0000000-0000-4000-8000-0000000000c2','B obj','finance-tax','run-b','running');
insert into public.agent_run_events (id,owner_id,run_id,event_type,idempotency_key,status,updated_at) values
 ('a0000000-0000-4000-8000-0000000000e1','a0000000-0000-4000-8000-00000000000a','a0000000-0000-4000-8000-0000000000a1','CASE_UPDATED','evt-a','received',now()),
 ('b0000000-0000-4000-8000-0000000000e2','b0000000-0000-4000-8000-00000000000b','b0000000-0000-4000-8000-0000000000b1','CASE_UPDATED','evt-b','processing',now()-interval '1 hour');

set local role authenticated;
set local "request.jwt.claim.sub" = 'a0000000-0000-4000-8000-00000000000a';
set local "request.jwt.claim.role" = 'authenticated';

do $$
declare n int;
begin
  select count(*) into n from public.claim_agent_run_events(10);
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A claimed % own events, expected 1', n; end if;

  select count(*) into n from public.claim_agent_run_events(10, 'b0000000-0000-4000-8000-00000000000b');
  if n <> 0 then raise exception 'RLS_TEST_FAILED: A claimed % events for B via owner override', n; end if;

  select public.recover_stale_agent_run_events(60, 'b0000000-0000-4000-8000-00000000000b') into n;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: A reclaimed % of B events', n; end if;

  -- A cannot even see B's rows, so the stale row must be untouched.
  select count(*) into n from public.agent_run_events where owner_id='b0000000-0000-4000-8000-00000000000b';
  if n <> 0 then raise exception 'RLS_TEST_FAILED: A sees % of B events', n; end if;

  raise notice 'CLAIM_SCOPE_OK';
end $$;
rollback;

-- Confirm B's row is still stale-processing (i.e. A's call changed nothing).
select status as b_status_after_a_call from public.agent_run_events where id='b0000000-0000-4000-8000-0000000000e2';

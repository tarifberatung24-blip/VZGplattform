-- Service-role dispatcher path: it must be able to claim for a named owner, and
-- the visibility timeout must return a crashed claim to `received`.
--
-- Stale-state staging runs as the table owner (postgres) with triggers disabled;
-- every assertion runs as service_role, which is the role the worker actually uses.
begin;
insert into auth.users (id,email,aud,role) values
 ('a0000000-0000-4000-8000-00000000000a','a@example.invalid','authenticated','authenticated');
insert into public.cases (id,owner_id,title,intent,horizon_status,horizon_module) values
 ('a0000000-0000-4000-8000-0000000000c1','a0000000-0000-4000-8000-00000000000a','A','reply','collecting_data','kuendigung');
insert into public.agent_runs (id,owner_id,case_id,objective,lead_agent,idempotency_key,status) values
 ('a0000000-0000-4000-8000-0000000000a1','a0000000-0000-4000-8000-00000000000a','a0000000-0000-4000-8000-0000000000c1','A obj','finance-tax','run-a','running');
insert into public.agent_run_events (id,owner_id,run_id,event_type,idempotency_key,status,max_attempts) values
 ('a0000000-0000-4000-8000-0000000000e1','a0000000-0000-4000-8000-00000000000a','a0000000-0000-4000-8000-0000000000a1','CASE_UPDATED','evt-a','processing',3);

-- A crashed worker left the claim stale.
set local session_replication_role = replica;
update public.agent_run_events set updated_at = now() - interval '1 hour'
 where id='a0000000-0000-4000-8000-0000000000e1';
set local session_replication_role = default;

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';

do $$
declare n int; claimed record;
begin
  -- Recovery requeues the crashed claim.
  select public.recover_stale_agent_run_events(60, 'a0000000-0000-4000-8000-00000000000a') into n;
  if n <> 1 then raise exception 'WORKER_TEST_FAILED: recovered % events, expected 1', n; end if;

  select status into claimed from public.agent_run_events where id='a0000000-0000-4000-8000-0000000000e1';
  if claimed.status <> 'received' then
    raise exception 'WORKER_TEST_FAILED: after recovery status=%', claimed.status;
  end if;

  -- The worker claims for a named owner; the claim marks it processing and
  -- increments the attempt, which is what bounds a repeatedly crashing run.
  select count(*) into n from public.claim_agent_run_events(10, 'a0000000-0000-4000-8000-00000000000a');
  if n <> 1 then raise exception 'WORKER_TEST_FAILED: claimed % events, expected 1', n; end if;

  select attempt, status into claimed from public.agent_run_events where id='a0000000-0000-4000-8000-0000000000e1';
  if claimed.status <> 'processing' or claimed.attempt <> 1 then
    raise exception 'WORKER_TEST_FAILED: state=% attempt=%', claimed.status, claimed.attempt;
  end if;

  -- A claim with no owner argument must find nothing, so a worker cannot silently
  -- sweep across owners by omitting the owner.
  select count(*) into n from public.claim_agent_run_events(10);
  if n <> 0 then raise exception 'WORKER_TEST_FAILED: unowned claim took % events', n; end if;

  raise notice 'WORKER_RECOVERY_OK';
end $$;
rollback;

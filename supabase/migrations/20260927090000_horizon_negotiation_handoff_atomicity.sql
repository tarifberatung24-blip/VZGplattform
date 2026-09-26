-- HORIZON NEGOTIATION — atomic MODE B handoff reservation and status application.
--
-- Two operations on the operator queue need more than a read-then-write round
-- trip from the application, because two clients can interleave between the read
-- and the write:
--
--   1. Reserving a handoff and deciding whether to deliver it. The queue key must
--      exist before anything leaves the process, otherwise a fast operator callback
--      can arrive before the key is persisted, and two concurrent submits can both
--      mint and send a job.
--   2. Applying a callback status. The status move and its timeline event must
--      land together, so the timeline cannot silently omit a move that happened.
--
-- Both are single statements (or a single transaction) inside a function, which is
-- the smallest construct that is genuinely atomic here. This is not a distributed
-- transaction: it is one PostgreSQL transaction per call.
--
-- Additive only: no table is created, dropped or renamed. `security invoker` is
-- deliberate — these functions run with the caller's privileges and remain subject
-- to row level security, so the owner isolation the tables already enforce is not
-- widened by adding them.

-- ---------------------------------------------------------------------------
-- 1. mode_b_delivery_status — whether the outbound delivery was attempted
-- ---------------------------------------------------------------------------
-- The reservation row alone cannot distinguish "a concurrent submit is about to
-- deliver" from "a previous delivery failed and this is a retry": both look like a
-- QUEUED handoff. Delivering on either would let a double-submit create two
-- external jobs, while never delivering on either would strand a failed handoff
-- forever. This column carries the distinction:
--
--   null        -> no handoff has been reserved
--   IN_FLIGHT   -> a caller is delivering (or died mid-delivery); do not re-send
--   DELIVERED   -> the receiver accepted it; do not re-send
--   FAILED      -> delivery failed; a retry may re-send with the same request id
--
-- A crash between sending and marking DELIVERED leaves IN_FLIGHT, which errs
-- toward not double-sending — the safe direction, at the cost of a stuck handoff
-- an operator can reset. The opposite default would risk a duplicate job.
alter table public.negotiation_sessions
  add column if not exists mode_b_delivery_status text check (
    mode_b_delivery_status is null
    or mode_b_delivery_status in ('IN_FLIGHT', 'DELIVERED', 'FAILED')
  );

-- The session client reserves and finalizes its own handoff, so it needs update
-- privilege on exactly this column — the update grant is column-scoped, matching
-- the pattern the base migration already uses.
grant update (mode_b_delivery_status)
  on public.negotiation_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- 2. reserve_negotiation_handoff
-- ---------------------------------------------------------------------------
-- Atomically reserves a handoff *and* decides whether the caller should deliver.
-- The UPDATE is the compare-and-set: of two concurrent callers, exactly one
-- reserves a new handoff.
--
-- Returns one row:
--   (request_id, deliver, status, reason)
--     reason = 'reserved'  -> a fresh reservation; deliver = true
--     reason = 'retry'     -> a previously failed delivery; deliver = true (same id)
--     reason = 'in_flight' -> another caller is delivering right now; deliver = false
--     reason = 'delivered' -> the receiver already has it; deliver = false
--     reason = 'active'    -> a live handoff past QUEUED; deliver = false
-- Returns no row when the session does not exist or is not owned by p_owner_id,
-- which the caller reports as not-found rather than retrying.
create or replace function public.reserve_negotiation_handoff(
  p_session_id uuid,
  p_owner_id uuid,
  p_request_id text
)
returns table (request_id text, deliver boolean, status text, reason text)
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_request_id text;
  v_status text;
  v_delivery text;
begin
  -- Fresh reservation: only when there is no active handoff.
  update public.negotiation_sessions
     set execution_mode = 'ASSISTED',
         mode_b_request_id = p_request_id,
         mode_b_status = 'QUEUED',
         mode_b_delivery_status = 'IN_FLIGHT',
         mode_b_queued_at = now(),
         mode_b_updated_at = now()
   where id = p_session_id
     and owner_id = p_owner_id
     and (mode_b_status is null or mode_b_status in ('COMPLETED', 'CANCELLED'));

  if found then
    return query select p_request_id, true, 'QUEUED'::text, 'reserved'::text;
    return;
  end if;

  select s.mode_b_request_id, s.mode_b_status, s.mode_b_delivery_status
    into v_request_id, v_status, v_delivery
    from public.negotiation_sessions s
   where s.id = p_session_id
     and s.owner_id = p_owner_id;

  -- Absent or not ours: RLS makes a foreign row invisible, so both land here.
  if v_request_id is null then
    return;
  end if;

  -- A handoff that is still QUEUED with a failed delivery may be retried, and the
  -- claim to retry is itself a compare-and-set so two concurrent retries resolve
  -- to one sender.
  if v_status = 'QUEUED' and v_delivery = 'FAILED' then
    update public.negotiation_sessions
       set mode_b_delivery_status = 'IN_FLIGHT',
           mode_b_updated_at = now()
     where id = p_session_id
       and owner_id = p_owner_id
       and mode_b_status = 'QUEUED'
       and mode_b_delivery_status = 'FAILED';

    if found then
      return query select v_request_id, true, v_status, 'retry'::text;
      return;
    end if;

    -- Another retry claimed it between our read and our write.
    return query select v_request_id, false, v_status, 'in_flight'::text;
    return;
  end if;

  if v_status = 'QUEUED' and v_delivery = 'IN_FLIGHT' then
    return query select v_request_id, false, v_status, 'in_flight'::text;
    return;
  end if;

  if v_status = 'QUEUED' and v_delivery = 'DELIVERED' then
    return query select v_request_id, false, v_status, 'delivered'::text;
    return;
  end if;

  -- Any other live status (IN_PROGRESS, AWAITING_*, ...): a callback proved the
  -- receiver has it, so it is never re-sent.
  return query select v_request_id, false, v_status, 'active'::text;
end;
$fn$;

revoke all on function public.reserve_negotiation_handoff(uuid, uuid, text) from anon;
revoke all on function public.reserve_negotiation_handoff(uuid, uuid, text) from public;
-- The customer session client reserves its own handoff.
grant execute on function public.reserve_negotiation_handoff(uuid, uuid, text) to authenticated;
grant execute on function public.reserve_negotiation_handoff(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. finalize_negotiation_handoff_delivery
-- ---------------------------------------------------------------------------
-- Records the outcome of an outbound delivery, keyed by request id so a late call
-- cannot mark a different handoff. FAILED is what allows a retry; DELIVERED
-- retires the handoff from re-sending.
--
-- A no-op when the request id does not match, so a stale finalization is ignored
-- rather than corrupting a newer handoff.
create or replace function public.finalize_negotiation_handoff_delivery(
  p_session_id uuid,
  p_owner_id uuid,
  p_request_id text,
  p_delivered boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  update public.negotiation_sessions
     set mode_b_delivery_status = case when p_delivered then 'DELIVERED' else 'FAILED' end,
         mode_b_updated_at = now()
   where id = p_session_id
     and owner_id = p_owner_id
     and mode_b_request_id = p_request_id;
  return found;
end;
$fn$;

revoke all on function public.finalize_negotiation_handoff_delivery(uuid, uuid, text, boolean) from anon;
revoke all on function public.finalize_negotiation_handoff_delivery(uuid, uuid, text, boolean) from public;
grant execute on function public.finalize_negotiation_handoff_delivery(uuid, uuid, text, boolean) to authenticated;
grant execute on function public.finalize_negotiation_handoff_delivery(uuid, uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 4. apply_negotiation_handoff_status
-- ---------------------------------------------------------------------------
-- The operator callback's status move and its timeline event are written in one
-- transaction, so a status cannot be stored without the event that explains it, or
-- vice versa. The status UPDATE is itself a compare-and-set on the status the
-- caller observed (p_from), so two identical callbacks racing cannot both apply:
-- the loser sees no row updated and the caller reports it as a concurrent no-op.
--
-- Returns true when the move and its event were written, false when the row is
-- absent, not owned, or no longer in p_from.
--
-- The platform-wide audit line is intentionally NOT part of this function: it lives
-- in a table owned by another subsystem, and folding it in would couple the
-- negotiation schema to it. The callback route writes it best-effort and reports a
-- failure explicitly instead of swallowing it.
create or replace function public.apply_negotiation_handoff_status(
  p_session_id uuid,
  p_owner_id uuid,
  p_from text,
  p_status text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  update public.negotiation_sessions
     set mode_b_status = p_status,
         mode_b_updated_at = now()
   where id = p_session_id
     and owner_id = p_owner_id
     and mode_b_status = p_from;

  if not found then
    return false;
  end if;

  insert into public.negotiation_events (owner_id, session_id, event_type, detail)
  values (
    p_owner_id,
    p_session_id,
    'operator_status_changed',
    jsonb_build_object('from', p_from, 'to', p_status, 'source', 'operator_callback')
  );

  return true;
end;
$fn$;

revoke all on function public.apply_negotiation_handoff_status(uuid, uuid, text, text) from anon;
revoke all on function public.apply_negotiation_handoff_status(uuid, uuid, text, text) from public;
revoke all on function public.apply_negotiation_handoff_status(uuid, uuid, text, text) from authenticated;
-- Only the operator/automation callback applies a status, and it does so through
-- the service-role client, so only that role may execute this.
grant execute on function public.apply_negotiation_handoff_status(uuid, uuid, text, text) to service_role;

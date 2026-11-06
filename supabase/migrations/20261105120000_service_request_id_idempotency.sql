-- HORIZON Service Request → Case: atomic DB-level idempotency.
--
-- PREPARED. Additive and idempotent: safe to run more than once and against a
-- database that already carries the column/index. DO NOT apply to production
-- without the owner's explicit approval; validate on a disposable project first
-- (see supabase/tests/rls/service_request_id_idempotency.sql).
--
-- WHY THIS EXISTS
-- `provisionHorizonServiceCase` guards against a duplicate case with a
-- read-then-write: it looks up the request id and, when nothing matches, creates a
-- case. Two concurrent requests for the same `service_request_id` can both read
-- "no case" and both create one. The application cannot close that window on its
-- own; this unique index does. It is the atomic guarantee, and the application
-- treats its `23505` unique_violation as "another request won the race" and
-- recovers the winner's case instead of failing.
--
-- WHY A COLUMN AND NOT `extracted_facts`
-- The request id also lives in `extracted_facts`, but a fact is written *after*
-- the case row is created, so a unique index on the fact still leaves a window in
-- which two cases exist before either writes its fact. Binding the request id to
-- the `cases` row makes "create the case" the atomic step: the row and its
-- idempotency key are one insert, so the race cannot produce two cases.
--
-- The index is keyed on (owner_id, service_request_id): one case per owner per
-- request id. `owner_id` is the case owner, so the guarantee is owner-scoped
-- exactly like the read policy and the lookup that depends on it. It is partial
-- (`where service_request_id is not null`) because the column is null for every
-- case that did not come from a service request.

-- 0. Pre-flight: refuse to create the index when duplicates already exist, with a
--    readable report instead of a raw "could not create unique index". This step
--    is READ-ONLY: it never deletes, rewrites or merges a row. If it raises, the
--    duplicate owner/request pairs must be resolved by the owner first.
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

  if dup_pairs > 0 then
    raise exception
      'service_request_id idempotency: % (owner, service_request_id) pair(s) already map to more than one case; resolve them before applying this migration (query in supabase/tests/rls/service_request_id_idempotency.sql)',
      dup_pairs;
  end if;
end $$;

-- 1. The idempotency key on the case itself. Nullable: only service-request cases
--    carry it. Idempotent: `if not exists`.
alter table public.cases
  add column if not exists service_request_id text;

comment on column public.cases.service_request_id is
  'Service Request → Case idempotency key. Set once on the case created for an intake request; the partial unique index below makes that insert the atomic dedup step.';

-- The session client (RLS-enforced) creates the case, so it needs the column
-- grant. Column-scoped, matching the existing cases grants; no table-wide grant.
grant insert (service_request_id) on public.cases to authenticated;

-- 2. The atomic guarantee. Idempotent.
create unique index if not exists cases_owner_service_request_id_uniq
  on public.cases (owner_id, service_request_id)
  where service_request_id is not null;

comment on index public.cases_owner_service_request_id_uniq is
  'One case per (owner, service_request_id): the atomic idempotency guarantee for the Service Request → Case workflow.';

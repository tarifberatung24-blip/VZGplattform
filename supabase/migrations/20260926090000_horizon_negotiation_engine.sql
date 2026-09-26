-- HORIZON NEGOTIATION ENGINE — additive schema.
--
-- This migration only adds. It does not drop, rename, rewrite, or weaken
-- anything, and it is safe to re-run (`if not exists` plus guarded blocks).
--
-- Design decisions, recorded so a later reader does not have to reverse them:
--
-- 1. `optimize_sessions` is NOT extended. Its `category` CHECK is `('energy','kfz')`
--    and the first negotiation categories are internet/mobile, which that
--    constraint cannot express. Widening the CHECK would also mean rewriting the
--    semantics of a table that already backs the live Optimize flow. The
--    negotiation lifecycle therefore gets its own tables, keyed to the SAME
--    `public.contracts` archive and the SAME owner/household tenancy, so there is
--    one contract model and one tenancy model — not a parallel contract system.
--
-- 2. Ownership is `owner_id = auth.uid()` on every row, mirroring the canonical
--    `cases` spine and `optimize_sessions`. `household_id` is also stored and used
--    for the cross-table contract check in application code, but RLS keys on
--    `owner_id` so a row can never be read or written across accounts.
--
-- 3. `negotiation_events` is the immutable, append-only negotiation timeline. It
--    grants INSERT and SELECT only — no UPDATE and no DELETE — so a historic
--    event cannot be edited or removed through the session client. Offer content
--    and its hash are likewise immutable after insert (see the trigger below), so
--    an approval that binds to a hash cannot be silently re-pointed.
--
-- 4. No provider credential, PIN, TAN, OTP, or banking secret has a column here
--    and none may be added. Provider contact is by customer number and by
--    user-supplied documents only.

-- ---------------------------------------------------------------------------
-- 1. Contract archive extensions (evidenced facts only)
-- ---------------------------------------------------------------------------
-- `promotion_expiry`, `services` and `price_history` are facts a user or a
-- document states. They are nullable/empty by default: an absent value stays
-- absent, and nothing here computes or estimates one.
alter table public.contracts
  add column if not exists promotion_expiry date;

alter table public.contracts
  add column if not exists services jsonb not null default '[]'::jsonb;

alter table public.contracts
  add column if not exists price_history jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. negotiation_sessions — one negotiation per contract run
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  category text not null,
  state text not null default 'CONTRACT' check (state in (
    'CONTRACT','ANALYSIS','OPPORTUNITY','STRATEGY','AUTHORIZATION','NEGOTIATION',
    'PROVIDER_RESPONSE','USER_REVIEW','USER_APPROVAL','CONFIRMED',
    'BILL_VERIFICATION','VERIFIED_SAVING','MONITOR'
  )),
  decision_action text check (decision_action is null or decision_action in (
    'NEGOTIATE','SWITCH','CANCEL','WAIT','NO_ACTION'
  )),
  reason_codes jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  opportunity_confidence numeric(5,4),
  next_review_date date,
  analysis jsonb not null default '{}'::jsonb,
  execution_mode text not null default 'SELF' check (execution_mode in ('SELF','ASSISTED','AUTOMATED')),
  mode_b_request_id text,
  authorization_status text not null default 'not_required' check (authorization_status in (
    'not_required','pending','granted','revoked'
  )),
  current_monthly_cost numeric(12,2),
  target_monthly_cost numeric(12,2),
  potential_monthly_saving numeric(12,2),
  potential_annual_saving numeric(12,2),
  promotion_expiry date,
  verification_due_at timestamptz,
  verified_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists negotiation_sessions_owner_state_idx
  on public.negotiation_sessions(owner_id, state);
create index if not exists negotiation_sessions_owner_contract_idx
  on public.negotiation_sessions(owner_id, contract_id);
create index if not exists negotiation_sessions_household_idx
  on public.negotiation_sessions(household_id);

alter table public.negotiation_sessions enable row level security;

drop policy if exists negotiation_sessions_owner_all on public.negotiation_sessions;
create policy negotiation_sessions_owner_all
on public.negotiation_sessions
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 3. negotiation_preferences — explicit user constraints with provenance
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.negotiation_sessions(id) on delete cascade,
  must_keep jsonb not null default '[]'::jsonb,
  may_accept jsonb not null default '[]'::jsonb,
  must_never_accept jsonb not null default '[]'::jsonb,
  max_contract_extension_months integer check (
    max_contract_extension_months is null or max_contract_extension_months >= 0
  ),
  allow_plan_change boolean not null default false,
  allow_addons boolean not null default false,
  allow_one_time_credit boolean not null default false,
  allow_temporary_discount boolean not null default false,
  min_monthly_saving numeric(12,2) check (
    min_monthly_saving is null or min_monthly_saving >= 0
  ),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id),
  unique (id, owner_id)
);

create index if not exists negotiation_preferences_owner_idx
  on public.negotiation_preferences(owner_id);

alter table public.negotiation_preferences enable row level security;

drop policy if exists negotiation_preferences_owner_all on public.negotiation_preferences;
create policy negotiation_preferences_owner_all
on public.negotiation_preferences
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 4. negotiation_offers — provider offers and user counter-offers
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.negotiation_sessions(id) on delete cascade,
  origin text not null check (origin in ('provider','user_counter','operator')),
  source text not null check (source in (
    'user_paste','uploaded_pdf','uploaded_image','email_import','operator_entry'
  )),
  document_id uuid references public.documents(id) on delete set null,
  content jsonb not null default '{}'::jsonb,
  content_hash text not null,
  parsed_facts jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in (
    'received','under_review','accepted','countered','rejected','superseded'
  )),
  supersedes_offer_id uuid references public.negotiation_offers(id) on delete set null,
  approved_hash text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists negotiation_offers_owner_session_idx
  on public.negotiation_offers(owner_id, session_id, created_at desc);

alter table public.negotiation_offers enable row level security;

drop policy if exists negotiation_offers_owner_all on public.negotiation_offers;
create policy negotiation_offers_owner_all
on public.negotiation_offers
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- Offer content and its hash are written once. A later edit would let an approval
-- hash bind to content it never approved, so it is refused at the database, not
-- only in application code. Status/approval columns remain updatable.
create or replace function public.reject_negotiation_offer_content_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.content is distinct from old.content
     or new.content_hash is distinct from old.content_hash
     or new.parsed_facts is distinct from old.parsed_facts
     or new.session_id is distinct from old.session_id
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Negotiation offer content is immutable; create a new offer instead';
  end if;
  return new;
end;
$$;

drop trigger if exists negotiation_offers_content_immutable on public.negotiation_offers;
create trigger negotiation_offers_content_immutable
before update on public.negotiation_offers
for each row execute function public.reject_negotiation_offer_content_update();

-- ---------------------------------------------------------------------------
-- 5. negotiation_authorizations — Mode B representation lifecycle
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_authorizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.negotiation_sessions(id) on delete cascade,
  scope text not null,
  status text not null default 'pending' check (status in ('pending','granted','revoked')),
  document_id uuid references public.documents(id) on delete set null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists negotiation_authorizations_owner_session_idx
  on public.negotiation_authorizations(owner_id, session_id);

alter table public.negotiation_authorizations enable row level security;

drop policy if exists negotiation_authorizations_owner_all on public.negotiation_authorizations;
create policy negotiation_authorizations_owner_all
on public.negotiation_authorizations
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 6. negotiation_verifications — bill verification per billing cycle
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_verifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.negotiation_sessions(id) on delete cascade,
  expected jsonb not null default '{}'::jsonb,
  actual jsonb,
  result text not null default 'pending' check (result in (
    'pending','VERIFIED','MISMATCH','NOT_YET_EFFECTIVE'
  )),
  discrepancies jsonb not null default '[]'::jsonb,
  document_id uuid references public.documents(id) on delete set null,
  due_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists negotiation_verifications_owner_session_idx
  on public.negotiation_verifications(owner_id, session_id);

alter table public.negotiation_verifications enable row level security;

drop policy if exists negotiation_verifications_owner_all on public.negotiation_verifications;
create policy negotiation_verifications_owner_all
on public.negotiation_verifications
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 7. negotiation_events — immutable negotiation timeline
-- ---------------------------------------------------------------------------
create table if not exists public.negotiation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.negotiation_sessions(id) on delete cascade,
  event_type text not null check (event_type in (
    'started','strategy_created','authorization_given','message_prepared',
    'message_sent_by_user','message_sent_by_operator','provider_response_received',
    'offer_parsed','counter_offer_created','offer_approved','offer_rejected',
    'provider_confirmed','verification_due','saving_verified','saving_failed'
  )),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists negotiation_events_owner_session_idx
  on public.negotiation_events(owner_id, session_id, created_at);

alter table public.negotiation_events enable row level security;

-- SELECT + INSERT only. No UPDATE or DELETE policy exists, and the table-level
-- grant below omits both, so the timeline is append-only through the session
-- client: a historic event can be read and added to, never changed or erased.
drop policy if exists negotiation_events_read_own on public.negotiation_events;
create policy negotiation_events_read_own
on public.negotiation_events
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists negotiation_events_insert_own on public.negotiation_events;
create policy negotiation_events_insert_own
on public.negotiation_events
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- 8. updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_negotiation_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists negotiation_sessions_updated_at on public.negotiation_sessions;
create trigger negotiation_sessions_updated_at
before update on public.negotiation_sessions
for each row execute function public.set_negotiation_updated_at();

drop trigger if exists negotiation_preferences_updated_at on public.negotiation_preferences;
create trigger negotiation_preferences_updated_at
before update on public.negotiation_preferences
for each row execute function public.set_negotiation_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Column-scoped grants for the request-scoped session client
-- ---------------------------------------------------------------------------
-- The session client is RLS-constrained and holds per-column privileges. Every
-- write path below is bounded to the columns it needs; no table-wide grant and
-- no anon access. `negotiation_events` deliberately receives no UPDATE/DELETE.
revoke all on public.negotiation_sessions from anon;
revoke all on public.negotiation_preferences from anon;
revoke all on public.negotiation_offers from anon;
revoke all on public.negotiation_authorizations from anon;
revoke all on public.negotiation_verifications from anon;
revoke all on public.negotiation_events from anon;

grant select on public.negotiation_sessions to authenticated;
grant insert (owner_id, household_id, contract_id, category, state, decision_action,
              reason_codes, missing_information, opportunity_confidence,
              next_review_date, analysis, execution_mode, current_monthly_cost,
              target_monthly_cost, potential_monthly_saving, potential_annual_saving,
              promotion_expiry)
  on public.negotiation_sessions to authenticated;
grant update (state, decision_action, reason_codes, missing_information,
              opportunity_confidence, next_review_date, analysis, execution_mode,
              mode_b_request_id, authorization_status, current_monthly_cost,
              target_monthly_cost, potential_monthly_saving, potential_annual_saving,
              promotion_expiry, verification_due_at, verified_at, closed_at)
  on public.negotiation_sessions to authenticated;

grant select on public.negotiation_preferences to authenticated;
grant insert (owner_id, session_id, must_keep, may_accept, must_never_accept,
              max_contract_extension_months, allow_plan_change, allow_addons,
              allow_one_time_credit, allow_temporary_discount, min_monthly_saving,
              provenance)
  on public.negotiation_preferences to authenticated;
grant update (must_keep, may_accept, must_never_accept, max_contract_extension_months,
              allow_plan_change, allow_addons, allow_one_time_credit,
              allow_temporary_discount, min_monthly_saving, provenance)
  on public.negotiation_preferences to authenticated;

grant select on public.negotiation_offers to authenticated;
grant insert (owner_id, session_id, origin, source, document_id, content,
              content_hash, parsed_facts, status, supersedes_offer_id)
  on public.negotiation_offers to authenticated;
grant update (status, approved_hash, approved_at, rejected_at)
  on public.negotiation_offers to authenticated;

grant select on public.negotiation_authorizations to authenticated;
grant insert (owner_id, session_id, scope, status, document_id, granted_at)
  on public.negotiation_authorizations to authenticated;
grant update (status, granted_at, revoked_at)
  on public.negotiation_authorizations to authenticated;

grant select on public.negotiation_verifications to authenticated;
grant insert (owner_id, session_id, expected, due_at)
  on public.negotiation_verifications to authenticated;
grant update (actual, result, discrepancies, document_id, verified_at)
  on public.negotiation_verifications to authenticated;

grant select on public.negotiation_events to authenticated;
grant insert (owner_id, session_id, event_type, detail)
  on public.negotiation_events to authenticated;

grant all on public.negotiation_sessions to service_role;
grant all on public.negotiation_preferences to service_role;
grant all on public.negotiation_offers to service_role;
grant all on public.negotiation_authorizations to service_role;
grant all on public.negotiation_verifications to service_role;
grant all on public.negotiation_events to service_role;

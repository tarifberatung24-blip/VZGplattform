-- Revenue attribution: connect an outbound partner click to the signed-in user
-- and the Optimize session it came from, and record evidenced savings.
--
-- Before this change `affiliate_click_events` only knew the offer, so a partner
-- conversion could never be traced back to a user, and HORIZON had nowhere to
-- store what a switch actually saved. This migration is additive only: two
-- nullable columns on an existing table and one new table. No existing row,
-- policy or grant is changed.

-- 1. Click attribution. Both columns stay null for anonymous clicks from the
--    public landing pages; deleting the user or session keeps the click count.
alter table public.affiliate_click_events
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists optimize_session_id uuid references public.optimize_sessions(id) on delete set null;

create index if not exists affiliate_click_events_user_id_idx
  on public.affiliate_click_events(user_id);
create index if not exists affiliate_click_events_optimize_session_id_idx
  on public.affiliate_click_events(optimize_session_id);

-- 2. Evidenced savings. A row exists only when a switch is backed by evidence
--    (the partner's confirmation or the new contract document). `secured` means
--    the new contract is confirmed; `realized` means it has started; `cancelled`
--    means it did not happen. Only real reductions are stored.
create table if not exists public.household_savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  optimize_session_id uuid references public.optimize_sessions(id) on delete set null,
  click_event_id uuid references public.affiliate_click_events(id) on delete set null,
  offer_id text not null
    check (offer_id in ('business-insurance', 'kfz', 'energy', 'credit', 'schufa')),
  old_monthly_cents integer not null check (old_monthly_cents > 0),
  new_monthly_cents integer not null check (new_monthly_cents >= 0),
  annual_saving_cents integer generated always as ((old_monthly_cents - new_monthly_cents) * 12) stored,
  status text not null default 'secured'
    check (status in ('secured', 'realized', 'cancelled')),
  switch_effective_date date,
  evidence_source text not null
    check (evidence_source in ('partner_confirmation', 'new_contract_document')),
  evidence_note text check (evidence_note is null or char_length(evidence_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_savings_real_reduction check (new_monthly_cents < old_monthly_cents),
  constraint household_savings_optimize_session_key unique (optimize_session_id)
);

create index if not exists household_savings_user_status_idx
  on public.household_savings(user_id, status);
create index if not exists household_savings_click_event_id_idx
  on public.household_savings(click_event_id);

alter table public.household_savings enable row level security;

-- The owner may read their own savings (for the "your value" dashboard).
-- Writes go only through the operator endpoint with the service role.
drop policy if exists household_savings_owner_select on public.household_savings;
create policy household_savings_owner_select
on public.household_savings
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.household_savings from anon;
revoke all on table public.household_savings from authenticated;
grant select on table public.household_savings to authenticated;
grant all on table public.household_savings to service_role;

create or replace function public.set_household_savings_updated_at()
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

drop trigger if exists household_savings_updated_at on public.household_savings;
create trigger household_savings_updated_at
before update on public.household_savings
for each row execute function public.set_household_savings_updated_at();

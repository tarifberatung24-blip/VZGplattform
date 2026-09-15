alter table public.contracts
  add column if not exists end_date date;

create unique index if not exists contracts_document_id_unique_idx
  on public.contracts(document_id) where document_id is not null;

create index if not exists contracts_household_end_date_idx
  on public.contracts(household_id, end_date);

create table if not exists public.contract_radar_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signal_key text not null,
  title text not null,
  detail text not null,
  tone text not null check (tone in ('attention', 'info')),
  rule_version text not null default 'v1',
  observed_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (contract_id, signal_key, rule_version)
);

create index if not exists contract_radar_history_household_idx
  on public.contract_radar_history(household_id, observed_at desc);

alter table public.contract_radar_history enable row level security;
drop policy if exists "contract_radar_history_owner_all" on public.contract_radar_history;
create policy "contract_radar_history_owner_all"
on public.contract_radar_history
for all
to authenticated
using (
  exists (
    select 1 from public.households h
    where h.id = contract_radar_history.household_id
      and h.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.households h
    where h.id = contract_radar_history.household_id
      and h.owner_id = (select auth.uid())
  )
)

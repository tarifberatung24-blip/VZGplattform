-- Additive Contracts PDF radar pilot fields and history.
alter table public.documents
  add column if not exists extracted_text text,
  add column if not exists extraction_status text not null default 'not_started'
    check (extraction_status in ('not_started', 'extracted', 'ocr_required', 'failed'));

alter table public.contracts
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists contract_number text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists cancellation_deadline date,
  add column if not exists review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'confirmed')),
  add column if not exists extraction_confidence numeric(5,4)
    check (extraction_confidence is null or extraction_confidence between 0 and 1),
  add column if not exists extracted_facts jsonb not null default '{}'::jsonb;

create table if not exists public.document_analysis_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  source text not null default 'ai',
  created_at timestamptz not null default now()
);

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  facts jsonb not null,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.document_analysis_results enable row level security;
alter table public.document_reviews enable row level security;
drop policy if exists "kintex_analysis_owner_all" on public.document_analysis_results;
create policy "kintex_analysis_owner_all" on public.document_analysis_results
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "kintex_reviews_owner_all" on public.document_reviews;
create policy "kintex_reviews_owner_all" on public.document_reviews
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists contracts_document_id_idx on public.contracts(document_id);
create unique index if not exists contracts_document_id_unique_idx
  on public.contracts(document_id) where document_id is not null;
create index if not exists contracts_household_end_date_idx on public.contracts(household_id, end_date);

create unique index if not exists document_reviews_document_id_unique_idx
  on public.document_reviews(document_id);

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
);

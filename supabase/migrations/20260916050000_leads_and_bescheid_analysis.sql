-- Leads and Bescheid analysis metadata. Keep ownership explicit and RLS enabled.
alter table public.documents
  add column if not exists analysis_json jsonb,
  add column if not exists analysis_provider text,
  add column if not exists analyzed_at timestamptz;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (phone is null or char_length(phone) <= 40),
  message text check (message is null or char_length(message) <= 4000),
  source text not null default 'dashboard_contact_expert',
  screening_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_household_id_idx on public.leads(household_id);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

alter table public.leads enable row level security;
drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_select_own" on public.leads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "leads_insert_own" on public.leads for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));

-- Required when the project has Data API exposure restrictions enabled.
grant select, insert on public.leads to authenticated;
grant select, update on public.documents to authenticated;

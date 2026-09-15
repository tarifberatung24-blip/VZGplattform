-- Additive table for benefit eligibility screening (orientation only).
-- Results store rule-based screening states — not official Behördenentscheidungen.
-- Apply only after explicit authorization (staging/backup plan).

create table if not exists public.benefit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  rule_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists benefit_checks_user_created_at_idx
  on public.benefit_checks (user_id, created_at desc);

alter table public.benefit_checks enable row level security;

drop policy if exists benefit_checks_select_own on public.benefit_checks;
create policy benefit_checks_select_own
  on public.benefit_checks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists benefit_checks_insert_own on public.benefit_checks;
create policy benefit_checks_insert_own
  on public.benefit_checks
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists benefit_checks_update_own on public.benefit_checks;
create policy benefit_checks_update_own
  on public.benefit_checks
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists benefit_checks_delete_own on public.benefit_checks;
create policy benefit_checks_delete_own
  on public.benefit_checks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.benefit_checks to authenticated;

comment on table public.benefit_checks is
  'User-owned benefit screening answers and rule-versioned results. Screening only — not an official eligibility decision.';

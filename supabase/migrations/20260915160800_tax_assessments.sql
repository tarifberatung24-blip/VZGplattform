-- Additive table for multi-step tax assessment intake.
-- Does not claim tax refund outcomes — total_amount stores the sum of user-entered expense amounts.
-- Apply only after explicit authorization (staging/backup plan).

create table if not exists public.tax_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profession text not null,
  expenses jsonb not null default '{}'::jsonb,
  total_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint tax_assessments_profession_check
    check (profession in ('employee', 'freelancer', 'student', 'other')),
  constraint tax_assessments_total_amount_non_negative
    check (total_amount >= 0)
);

create index if not exists tax_assessments_user_created_at_idx
  on public.tax_assessments (user_id, created_at desc);

alter table public.tax_assessments enable row level security;

drop policy if exists tax_assessments_select_own on public.tax_assessments;
create policy tax_assessments_select_own
  on public.tax_assessments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists tax_assessments_insert_own on public.tax_assessments;
create policy tax_assessments_insert_own
  on public.tax_assessments
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists tax_assessments_update_own on public.tax_assessments;
create policy tax_assessments_update_own
  on public.tax_assessments
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists tax_assessments_delete_own on public.tax_assessments;
create policy tax_assessments_delete_own
  on public.tax_assessments
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.tax_assessments to authenticated;

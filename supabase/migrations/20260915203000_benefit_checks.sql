-- Eligibility Engine result snapshots.
-- Apply in Supabase SQL Editor before using /anspruch.
create table if not exists public.benefit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  eligible_benefits jsonb not null default '[]'::jsonb,
  rules_version text not null default '2026-09-15',
  created_at timestamptz not null default now(),
  constraint benefit_checks_answers_object_check
    check (jsonb_typeof(answers) = 'object'),
  constraint benefit_checks_results_array_check
    check (jsonb_typeof(eligible_benefits) = 'array')
);

create index if not exists benefit_checks_user_created_at_idx
  on public.benefit_checks (user_id, created_at desc);

alter table public.benefit_checks enable row level security;

-- Users may only access their own eligibility snapshots.
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

drop policy if exists benefit_checks_delete_own on public.benefit_checks;
create policy benefit_checks_delete_own
  on public.benefit_checks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Results are snapshots: no client-side updates are allowed.
revoke all on table public.benefit_checks from anon, public, authenticated;
grant select, insert, delete on public.benefit_checks to authenticated;

comment on table public.benefit_checks is
  'User-owned, non-binding eligibility snapshots produced by the VZG benefits rules engine.';
comment on column public.benefit_checks.eligible_benefits is
  'Calculated benefit cards with key, title, explanation and next step.';


-- Minimal document metadata index for the unified workspace.
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  constraint user_documents_status_check
    check (status in ('uploaded', 'processing', 'ready', 'error'))
);

create index if not exists user_documents_user_created_at_idx
  on public.user_documents (user_id, created_at desc);

alter table public.user_documents enable row level security;

drop policy if exists user_documents_select_own on public.user_documents;
create policy user_documents_select_own
  on public.user_documents
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_documents from anon, public, authenticated;
grant select on public.user_documents to authenticated;

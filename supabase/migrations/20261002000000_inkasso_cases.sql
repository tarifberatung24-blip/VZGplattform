-- Inkasso-Check cases.
--
-- One row per user-owned case. The parties/claim/dates/evidence groups are
-- stored as jsonb because they are filled in progressively by the wizard and
-- are revised after extraction, so a column-per-field schema would churn on
-- every rule-pack revision. The evaluation is written once per run so the
-- pack version stays auditable.

create table if not exists public.inkasso_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null check (locale in ('bg', 'de')),
  case_type text not null default 'inkasso'
    check (case_type in ('mahnbescheid', 'inkasso', 'utility_dispute')),
  status text not null default 'intake'
    check (status in ('intake', 'extracted', 'evaluated', 'drafted', 'in_review', 'closed')),
  parties jsonb not null default '{}'::jsonb,
  claim jsonb not null default '{}'::jsonb,
  dates jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  evaluation jsonb,
  drafts jsonb not null default '[]'::jsonb,
  document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inkasso_cases_user_updated_idx
  on public.inkasso_cases (user_id, updated_at desc);

alter table public.inkasso_cases enable row level security;

drop policy if exists "inkasso_cases_owner_all" on public.inkasso_cases;
create policy "inkasso_cases_owner_all" on public.inkasso_cases
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_inkasso_cases_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists inkasso_cases_updated_at on public.inkasso_cases;
create trigger inkasso_cases_updated_at
  before update on public.inkasso_cases
  for each row execute function public.set_inkasso_cases_updated_at();

revoke all on public.inkasso_cases from anon;
grant select, insert, update, delete on public.inkasso_cases to authenticated;

comment on table public.inkasso_cases is
  'User-owned Inkasso-Check cases. Facts are untrusted until the user confirms them; evaluation is a deterministic rule-pack result, not legal advice.';

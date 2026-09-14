create table if not exists public.kindergeld_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null check (locale in ('bg', 'de')),
  status text not null default 'draft' check (status in ('draft', 'ready_for_review', 'submitted')),
  answers jsonb not null default '{}'::jsonb,
  current_step integer not null default 0 check (current_step >= 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists kindergeld_cases_user_updated_idx on public.kindergeld_cases (user_id, updated_at desc);
alter table public.kindergeld_cases enable row level security;
drop policy if exists "kindergeld_cases_owner_all" on public.kindergeld_cases;
create policy "kindergeld_cases_owner_all" on public.kindergeld_cases for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.set_kindergeld_cases_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists kindergeld_cases_updated_at on public.kindergeld_cases;
create trigger kindergeld_cases_updated_at before update on public.kindergeld_cases for each row execute function public.set_kindergeld_cases_updated_at();

revoke all on public.kindergeld_cases from anon;
grant select, insert, update, delete on public.kindergeld_cases to authenticated;
COMMENT ON TABLE public.kindergeld_cases IS 'User-owned Kindergeld wizard drafts; answers are untrusted until reviewed.';

create table if not exists public.optimize_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  category text not null check (category in ('energy', 'kfz')),
  status text not null default 'draft' check (status in ('draft', 'processing', 'needs_input', 'ready_for_review', 'confirmed', 'cancelled', 'failed')),
  filled_data jsonb not null default '{}'::jsonb,
  comparison jsonb,
  partner_id text,
  affiliate_url text,
  ai_explanation text,
  user_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists optimize_sessions_user_status_idx
  on public.optimize_sessions(user_id, status);
create index if not exists optimize_sessions_contract_id_idx
  on public.optimize_sessions(contract_id);

alter table public.optimize_sessions enable row level security;

drop policy if exists optimize_sessions_owner_all on public.optimize_sessions;
create policy optimize_sessions_owner_all
on public.optimize_sessions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_optimize_sessions_updated_at()
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

drop trigger if exists optimize_sessions_updated_at on public.optimize_sessions;
create trigger optimize_sessions_updated_at
before update on public.optimize_sessions
for each row execute function public.set_optimize_sessions_updated_at();

create table if not exists public.user_email_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  email text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  access_token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_email_connections enable row level security;

drop policy if exists "email connections owner select" on public.user_email_connections;
create policy "email connections owner select"
  on public.user_email_connections for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "email connections owner insert" on public.user_email_connections;
create policy "email connections owner insert"
  on public.user_email_connections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "email connections owner update" on public.user_email_connections;
create policy "email connections owner update"
  on public.user_email_connections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "email connections owner delete" on public.user_email_connections;
create policy "email connections owner delete"
  on public.user_email_connections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Local/staging harness prelude: the Supabase-managed objects a plain PostgreSQL
-- instance does not have. This file is NOT a migration and must never be applied
-- to a Supabase project — there, these schemas already exist and are managed by
-- the platform.
--
-- It exists so the real migrations under supabase/migrations/ can be applied to a
-- throwaway local database and exercised as genuine integration tests rather than
-- asserted as text.

create schema if not exists auth;
create schema if not exists storage;
create extension if not exists pgcrypto;

-- auth.users, narrowed to the columns the migrations reference.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  aud text,
  role text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- The roles the migration grants reference. Supabase creates these; a bare
-- cluster does not.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- auth.uid() reads the request-scoped claim, exactly as Supabase's does. Tests
-- set it with set_config('request.jwt.claim.sub', ...).
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;

-- storage.objects, narrowed to what the baseline's Storage policies touch.
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

alter table storage.objects enable row level security;

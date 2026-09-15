-- VZGplattform AI and profile schema.
-- Apply only after review, backup and confirmation in Supabase SQL Editor.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'bg',
  household jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_locale_check check (locale in ('bg', 'de', 'en')),
  constraint user_profiles_household_object_check check (jsonb_typeof(household) = 'object')
);

create table if not exists public.document_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.user_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ready',
  model text,
  analysis_version text not null default '2026-09-15',
  document_type text not null default 'unknown',
  issuing_authority text,
  bescheid_date date,
  known_access_date date,
  remedy_deadline date,
  payment_deadline date,
  summary_bg text not null default '',
  required_action_bg text not null default '',
  missing_information jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  human_review_required boolean not null default true,
  raw_extraction jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_analyses_status_check check (status in ('ready', 'needs_review', 'error')),
  constraint document_analyses_missing_information_array_check check (jsonb_typeof(missing_information) = 'array'),
  constraint document_analyses_citations_array_check check (jsonb_typeof(citations) = 'array'),
  constraint document_analyses_raw_extraction_object_check check (jsonb_typeof(raw_extraction) = 'object')
);

create index if not exists document_analyses_user_created_at_idx
  on public.document_analyses (user_id, created_at desc);
create index if not exists document_analyses_document_created_at_idx
  on public.document_analyses (document_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.document_analyses enable row level security;

revoke all on table public.user_profiles from anon, public, authenticated;
revoke all on table public.document_analyses from anon, public, authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select, insert on public.document_analyses to authenticated;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists document_analyses_select_own on public.document_analyses;
create policy document_analyses_select_own on public.document_analyses
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists document_analyses_insert_own on public.document_analyses;
create policy document_analyses_insert_own on public.document_analyses
  for insert to authenticated with check (user_id = (select auth.uid()));

comment on table public.user_profiles is 'Minimal user-owned profile and household context for VZG personalization.';
comment on table public.document_analyses is 'Non-binding AI extraction drafts. They never constitute a legal or administrative decision.';
comment on column public.document_analyses.raw_extraction is 'Validated structured extraction with uncertainty and source citations; do not store uploaded binary content here.';

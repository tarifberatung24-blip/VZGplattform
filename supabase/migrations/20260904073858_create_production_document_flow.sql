-- Backfill the migration version used by the Supabase Preview integration.
-- The statements are idempotent for the existing Frankfurt schema.

create table if not exists public.document_analysis_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  source text not null default 'ai' check (source in ('ai', 'demo')),
  created_at timestamptz not null default now()
);

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  facts jsonb not null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_analysis_results_document_id_idx on public.document_analysis_results (document_id, created_at desc);
create index if not exists document_analysis_results_user_id_idx on public.document_analysis_results (user_id, created_at desc);
create index if not exists document_reviews_document_id_idx on public.document_reviews (document_id, created_at desc);
create index if not exists document_reviews_user_id_idx on public.document_reviews (user_id, created_at desc);
create index if not exists audit_events_user_id_idx on public.audit_events (user_id, created_at desc);
create index if not exists audit_events_document_id_idx on public.audit_events (document_id, created_at desc);

alter table public.document_analysis_results enable row level security;
alter table public.document_reviews enable row level security;
alter table public.audit_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_analysis_results' and policyname = 'document_analysis_owner') then
    create policy document_analysis_owner on public.document_analysis_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_reviews' and policyname = 'document_reviews_owner') then
    create policy document_reviews_owner on public.document_reviews for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_owner_select') then
    create policy audit_events_owner_select on public.audit_events for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_owner_insert') then
    create policy audit_events_owner_insert on public.audit_events for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'document_storage_owner_insert') then
    create policy document_storage_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and (storage.foldername(name))[2] = (select auth.uid()::text));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'document_storage_owner_select') then
    create policy document_storage_owner_select on storage.objects for select to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and (storage.foldername(name))[2] = (select auth.uid()::text));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'document_storage_owner_delete') then
    create policy document_storage_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and (storage.foldername(name))[2] = (select auth.uid()::text));
  end if;
end $$;

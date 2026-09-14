-- PREPARED ONLY: old document demo draft for Frankfurt project (numyqalfphyrnedlfzfs)
-- Review and apply intentionally. This migration has not been executed.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  original_name text not null,
  normalized_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  status text not null default 'uploaded' check (status in ('uploaded', 'awaiting_analysis', 'processing', 'processed', 'needs_review', 'reviewed', 'analysis_not_configured', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.document_analysis_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  source text not null default 'demo' check (source in ('demo', 'ai')),
  created_at timestamptz not null default now()
);

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  facts jsonb not null,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
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

create index if not exists documents_owner_created_idx on public.documents (user_id, created_at desc);
create index if not exists document_analysis_results_document_idx on public.document_analysis_results (document_id, created_at desc);
create index if not exists document_reviews_document_idx on public.document_reviews (document_id, created_at desc);
create index if not exists audit_events_owner_created_idx on public.audit_events (user_id, created_at desc);

alter table public.documents enable row level security;
alter table public.document_analysis_results enable row level security;
alter table public.document_reviews enable row level security;
alter table public.audit_events enable row level security;

create policy "documents_owner_all" on public.documents for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "analysis_owner_all" on public.document_analysis_results for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reviews_owner_all" on public.document_reviews for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "audit_owner_select_insert" on public.audit_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "audit_owner_insert" on public.audit_events for insert to authenticated with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_owner_select" on storage.objects for select to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and exists (select 1 from public.documents d where d.user_id = (select auth.uid()) and d.storage_path = name));
create policy "documents_owner_insert" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and exists (select 1 from public.documents d where d.user_id = (select auth.uid()) and d.storage_path = name));
create policy "documents_owner_delete" on storage.objects for delete to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'households' and exists (select 1 from public.documents d where d.user_id = (select auth.uid()) and d.storage_path = name));

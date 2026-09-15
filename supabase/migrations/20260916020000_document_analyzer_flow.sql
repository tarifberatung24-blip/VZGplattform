-- Document Analyzer flow: ownership, realtime status and safe client writes.
-- Apply in Supabase SQL Editor after the existing AI schema migration.

alter table public.document_analyses enable row level security;

revoke all on table public.document_analyses from anon, public, authenticated;
grant select, insert on public.document_analyses to authenticated;

drop policy if exists document_analyses_select_own on public.document_analyses;
create policy document_analyses_select_own
  on public.document_analyses
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists document_analyses_insert_own on public.document_analyses;
create policy document_analyses_insert_own
  on public.document_analyses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

alter table public.user_documents enable row level security;

revoke all on table public.user_documents from anon, public, authenticated;
grant select, insert, update on public.user_documents to authenticated;

drop policy if exists user_documents_select_own on public.user_documents;
create policy user_documents_select_own
  on public.user_documents
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_documents_insert_own on public.user_documents;
create policy user_documents_insert_own
  on public.user_documents
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_documents_update_own on public.user_documents;
create policy user_documents_update_own
  on public.user_documents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Add tables to Realtime only when they are not already present.
do $$
begin
  if to_regclass('public.user_documents') is not null
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_documents') then
    alter publication supabase_realtime add table public.user_documents;
  end if;
  if to_regclass('public.document_analyses') is not null
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'document_analyses') then
    alter publication supabase_realtime add table public.document_analyses;
  end if;
end;
$$;

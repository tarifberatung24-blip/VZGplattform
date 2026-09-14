-- Harden document processing state transitions used by the API.
-- This migration is additive and safe for the Frankfurt project.

create index if not exists documents_processing_status_idx
  on public.documents(processing_status, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_processing_status_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_processing_status_check
      check (processing_status in (
        'uploaded',
        'extracting',
        'awaiting_analysis',
        'analysis_not_configured',
        'processed',
        'needs_review',
        'failed'
      ));
  end if;
end $$;

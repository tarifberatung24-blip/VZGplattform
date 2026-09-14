-- KintexBG B2C V1 consolidated baseline
-- Source: read-only snapshot of production migration history on 2026-09-08.
-- Target: a NEW, EMPTY Supabase project only.
-- NEVER apply this file to the existing production project.
-- Apply supabase/prepared/kintex_b2c_rls_hardening.sql after this baseline.


-- Applied production migration: 20260901165451_create_mission_1_foundation
-- Mission 1: AI Home Office Assistant — Secure Application Foundation
-- Created: 2026-09-01T00:00:00Z
-- Supabase Project: ai-home-office-v1-eu (numyqalfphyrnedlfzfs)
-- This migration implements the complete data model, RLS policies, storage, triggers, and indexes.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'de' CHECK (preferred_language IN ('bg', 'de')),
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'DE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX households_owner_id ON public.households(owner_id);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "households_select_own" ON public.households FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "households_insert_own" ON public.households FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "households_update_own" ON public.households FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "households_delete_own" ON public.households FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('electricity','gas','internet','mobile','insurance','housing','subscription','public_authority','debt_collection','other')),
  website TEXT, customer_service_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_select_authenticated" ON public.providers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('electricity','gas','internet','mobile','insurance','housing','subscription','other')),
  title TEXT NOT NULL, provider_name TEXT NOT NULL, customer_number TEXT, contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','cancellation_planned','cancelled','expired','unknown')),
  start_date DATE, minimum_term_end DATE, cancellation_notice_value INTEGER CHECK (cancellation_notice_value IS NULL OR cancellation_notice_value >= 0),
  cancellation_notice_unit TEXT CHECK (cancellation_notice_unit IS NULL OR cancellation_notice_unit IN ('days','weeks','months')),
  cancellation_deadline DATE, renewal_date DATE, monthly_amount NUMERIC(12,2) CHECK (monthly_amount IS NULL OR monthly_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR', payment_interval TEXT CHECK (payment_interval IS NULL OR payment_interval IN ('monthly','quarterly','semiannual','annual','one_time','other')),
  notes TEXT, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX contracts_household_id ON public.contracts(household_id); CREATE INDEX contracts_status ON public.contracts(status); CREATE INDEX contracts_cancellation_deadline ON public.contracts(cancellation_deadline);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_select_own_household" ON public.contracts FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "contracts_insert_own_household" ON public.contracts FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "contracts_update_own_household" ON public.contracts FOR UPDATE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "contracts_delete_own_household" ON public.contracts FOR DELETE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL, title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('moving','cancellation','provider_change','billing_question','complaint','debt_collection','authority_correspondence','insurance','general')),
  description TEXT, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','collecting_information','ready_for_review','awaiting_user_approval','approved','sent','awaiting_reply','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')), due_date DATE, user_intent TEXT,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), closed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX cases_household_id ON public.cases(household_id); CREATE INDEX cases_status ON public.cases(status); CREATE INDEX cases_due_date ON public.cases(due_date);
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cases_select_own_household" ON public.cases FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "cases_insert_own_household" ON public.cases FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "cases_update_own_household" ON public.cases FOR UPDATE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "cases_delete_own_household" ON public.cases FOR DELETE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL, case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL, storage_path TEXT NOT NULL UNIQUE, mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('contract','invoice','reminder','cancellation','provider_letter','authority_letter','debt_collection_letter','payment_proof','identity_document','other')),
  processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded','awaiting_analysis','analysis_not_configured','processed','needs_review','failed')),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX documents_household_id ON public.documents(household_id); CREATE INDEX documents_contract_id ON public.documents(contract_id); CREATE INDEX documents_case_id ON public.documents(case_id);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_own_household" ON public.documents FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_insert_own_household" ON public.documents FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_update_own_household" ON public.documents FOR UPDATE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_delete_own_household" ON public.documents FOR DELETE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.tasks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE, case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE, contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','completed','cancelled')), due_at TIMESTAMP WITH TIME ZONE, reminder_at TIMESTAMP WITH TIME ZONE, completed_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX tasks_household_id ON public.tasks(household_id); CREATE INDEX tasks_case_id ON public.tasks(case_id); CREATE INDEX tasks_status ON public.tasks(status); CREATE INDEX tasks_due_at ON public.tasks(due_at);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select_own_household" ON public.tasks FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "tasks_insert_own_household" ON public.tasks FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "tasks_update_own_household" ON public.tasks FOR UPDATE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "tasks_delete_own_household" ON public.tasks FOR DELETE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.correspondence_drafts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE, case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE, language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('bg','de')), recipient_name TEXT, recipient_email TEXT, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','needs_review','awaiting_approval','approved','rejected','sent')), generated_by TEXT NOT NULL DEFAULT 'user' CHECK (generated_by IN ('user','template','ai_not_configured','ai')), evidence_summary JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX correspondence_drafts_household_id ON public.correspondence_drafts(household_id); CREATE INDEX correspondence_drafts_case_id ON public.correspondence_drafts(case_id); CREATE INDEX correspondence_drafts_status ON public.correspondence_drafts(status);
ALTER TABLE public.correspondence_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "correspondence_drafts_select_own_household" ON public.correspondence_drafts FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "correspondence_drafts_insert_own_household" ON public.correspondence_drafts FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "correspondence_drafts_update_own_household" ON public.correspondence_drafts FOR UPDATE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "correspondence_drafts_delete_own_household" ON public.correspondence_drafts FOR DELETE TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.approvals (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE, case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE, draft_id UUID REFERENCES public.correspondence_drafts(id) ON DELETE CASCADE, action_type TEXT NOT NULL, action_summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')), approved_at TIMESTAMP WITH TIME ZONE, rejected_at TIMESTAMP WITH TIME ZONE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX approvals_household_id ON public.approvals(household_id); CREATE INDEX approvals_case_id ON public.approvals(case_id); CREATE INDEX approvals_status ON public.approvals(status);
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select_own_household" ON public.approvals FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "approvals_insert_own_household" ON public.approvals FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.audit_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE, actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, entity_type TEXT NOT NULL, entity_id UUID, event_type TEXT NOT NULL, event_summary TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_household_id ON public.audit_events(household_id); CREATE INDEX audit_events_created_at ON public.audit_events(created_at);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_events_select_own_household" ON public.audit_events FOR SELECT TO authenticated USING (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "audit_events_insert_own_household" ON public.audit_events FOR INSERT TO authenticated WITH CHECK (household_id IN (SELECT id FROM public.households WHERE owner_id = auth.uid()) AND actor_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER profiles_updated_at_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER households_updated_at_trigger BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER providers_updated_at_trigger BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER contracts_updated_at_trigger BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER cases_updated_at_trigger BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER documents_updated_at_trigger BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tasks_updated_at_trigger BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER correspondence_drafts_updated_at_trigger BEFORE UPDATE ON public.correspondence_drafts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "documents_storage_select_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_storage_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_storage_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.households WHERE owner_id = auth.uid())) WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.households WHERE owner_id = auth.uid()));
CREATE POLICY "documents_storage_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.households WHERE owner_id = auth.uid()));

-- Applied production migration: 20260905153610_kintex_profile_household_core
alter table public.profiles
  add column if not exists employment_status text,
  add column if not exists household_size integer check (household_size > 0),
  add column if not exists monthly_income numeric(14,2) check (monthly_income >= 0),
  add column if not exists monthly_fixed_costs numeric(14,2) check (monthly_fixed_costs >= 0),
  add column if not exists completeness integer not null default 0 check (completeness between 0 and 100);

create or replace function public.ensure_kintex_household()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  household uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  insert into public.profiles (id) values (current_user_id) on conflict (id) do nothing;
  select id into household from public.households where owner_id = current_user_id order by created_at, id limit 1;
  if household is null then
    insert into public.households (owner_id, name, country) values (current_user_id, 'KintexBG', 'DE') returning id into household;
  end if;
  return household;
end;
$$;
revoke all on function public.ensure_kintex_household() from public, anon;
grant execute on function public.ensure_kintex_household() to authenticated;

-- Applied production migration: 20260905153636_kintex_documents_storage_insert
create policy "kintex_documents_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);

-- Applied production migration: 20260905153642_kintex_documents_storage_select
create policy "kintex_documents_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);

-- Applied production migration: 20260905153649_kintex_documents_storage_update
create policy "kintex_documents_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);

-- Applied production migration: 20260905153654_kintex_documents_storage_delete
create policy "kintex_documents_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'households'
  and (storage.foldername(name))[2] in (
    select id::text from public.households where owner_id = (select auth.uid())
  )
);

-- Applied production migration: 20260906182525_contract_document_radar_pilot
-- KintexBG Contracts PDF/Radar pilot. Additive only; no production data is removed.

alter table public.documents
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists extracted_text text,
  add column if not exists extraction_method text,
  add column if not exists extraction_status text not null default 'not_started',
  add column if not exists extraction_error text,
  add column if not exists extraction_metadata jsonb not null default '{}'::jsonb,
  add column if not exists confirmed_facts jsonb,
  add column if not exists extracted_at timestamp with time zone,
  add column if not exists reviewed_at timestamp with time zone,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'documents_extraction_method_check') then
    alter table public.documents add constraint documents_extraction_method_check
      check (extraction_method is null or extraction_method in ('digital_pdf', 'ocr'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'documents_extraction_status_check') then
    alter table public.documents add constraint documents_extraction_status_check
      check (extraction_status in ('not_started', 'processing', 'extracted', 'ocr_required', 'failed'));
  end if;
end $$;

alter table public.contracts
  add column if not exists minimum_term_end date,
  add column if not exists cancellation_notice_value integer,
  add column if not exists cancellation_notice_unit text,
  add column if not exists cancellation_deadline date,
  add column if not exists currency text not null default 'EUR',
  add column if not exists payment_interval text,
  add column if not exists notes text,
  add column if not exists contract_end date,
  add column if not exists source_document_id uuid references public.documents(id) on delete set null,
  add column if not exists reviewed_at timestamp with time zone;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contracts' and column_name = 'end_date'
  ) then
    execute 'update public.contracts set contract_end = end_date where contract_end is null and end_date is not null';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracts_cancellation_notice_value_check') then
    alter table public.contracts add constraint contracts_cancellation_notice_value_check
      check (cancellation_notice_value is null or cancellation_notice_value >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracts_cancellation_notice_unit_check') then
    alter table public.contracts add constraint contracts_cancellation_notice_unit_check
      check (cancellation_notice_unit is null or cancellation_notice_unit in ('days', 'weeks', 'months'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contracts_payment_interval_check') then
    alter table public.contracts add constraint contracts_payment_interval_check
      check (payment_interval is null or payment_interval in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time', 'other'));
  end if;
end $$;

create index if not exists contracts_source_document_id_idx on public.contracts(source_document_id);
create index if not exists contracts_contract_end_idx on public.contracts(contract_end);
create index if not exists documents_reviewed_by_idx on public.documents(reviewed_by);
create index if not exists documents_contract_id_idx on public.documents(contract_id);

alter table public.contracts enable row level security;
alter table public.documents enable row level security;

drop policy if exists "contracts_select_own_household" on public.contracts;
create policy "contracts_select_own_household" on public.contracts for select to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "contracts_insert_own_household" on public.contracts;
create policy "contracts_insert_own_household" on public.contracts for insert to authenticated
with check (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "contracts_update_own_household" on public.contracts;
create policy "contracts_update_own_household" on public.contracts for update to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())))
with check (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "contracts_delete_own_household" on public.contracts;
create policy "contracts_delete_own_household" on public.contracts for delete to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));

drop policy if exists "documents_select_own_household" on public.documents;
create policy "documents_select_own_household" on public.documents for select to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "documents_insert_own_household" on public.documents;
create policy "documents_insert_own_household" on public.documents for insert to authenticated
with check (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "documents_update_own_household" on public.documents;
create policy "documents_update_own_household" on public.documents for update to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())))
with check (household_id in (select id from public.households where owner_id = (select auth.uid())));
drop policy if exists "documents_delete_own_household" on public.documents;
create policy "documents_delete_own_household" on public.documents for delete to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));

revoke all on table public.contracts, public.documents from anon;
grant select, insert, update, delete on table public.contracts, public.documents to authenticated;

create table if not exists public.radar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signal_type text not null check (signal_type in ('missing_amount', 'needs_review', 'contract_expiring', 'cancellation_deadline')),
  severity text not null check (severity in ('info', 'attention')),
  dedupe_key text not null,
  title text not null,
  detail text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone,
  unique (household_id, dedupe_key)
);

create index if not exists radar_events_household_created_idx on public.radar_events(household_id, created_at desc);
create index if not exists radar_events_contract_idx on public.radar_events(contract_id);
alter table public.radar_events enable row level security;

drop policy if exists "radar_events_select_own_household" on public.radar_events;
create policy "radar_events_select_own_household"
on public.radar_events for select to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));

drop policy if exists "radar_events_insert_own_household" on public.radar_events;
create policy "radar_events_insert_own_household"
on public.radar_events for insert to authenticated
with check (
  household_id in (select id from public.households where owner_id = (select auth.uid()))
  and contract_id in (select id from public.contracts where household_id = radar_events.household_id)
);

drop policy if exists "radar_events_update_own_household" on public.radar_events;
create policy "radar_events_update_own_household"
on public.radar_events for update to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())))
with check (
  household_id in (select id from public.households where owner_id = (select auth.uid()))
  and contract_id in (select id from public.contracts where household_id = radar_events.household_id)
);

drop policy if exists "radar_events_delete_own_household" on public.radar_events;
create policy "radar_events_delete_own_household"
on public.radar_events for delete to authenticated
using (household_id in (select id from public.households where owner_id = (select auth.uid())));

revoke all on table public.radar_events from anon;
grant select, insert, update, delete on table public.radar_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']::text[])
on conflict (id) do nothing;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[]
where id = 'documents';

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Applied production migration: 20260906223424_contract_document_radar_pilot_finalize
-- Additive Contracts PDF radar pilot fields and history.
alter table public.documents
  add column if not exists extracted_text text,
  add column if not exists extraction_status text not null default 'not_started'
    check (extraction_status in ('not_started', 'extracted', 'ocr_required', 'failed'));

alter table public.contracts
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists contract_number text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists cancellation_deadline date,
  add column if not exists review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'confirmed')),
  add column if not exists extraction_confidence numeric(5,4)
    check (extraction_confidence is null or extraction_confidence between 0 and 1),
  add column if not exists extracted_facts jsonb not null default '{}'::jsonb;

create table if not exists public.document_analysis_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  source text not null default 'ai',
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

alter table public.document_analysis_results enable row level security;
alter table public.document_reviews enable row level security;
drop policy if exists "kintex_analysis_owner_all" on public.document_analysis_results;
create policy "kintex_analysis_owner_all" on public.document_analysis_results
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "kintex_reviews_owner_all" on public.document_reviews;
create policy "kintex_reviews_owner_all" on public.document_reviews
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists contracts_document_id_idx on public.contracts(document_id);
create unique index if not exists contracts_document_id_unique_idx
  on public.contracts(document_id) where document_id is not null;
create index if not exists contracts_household_end_date_idx on public.contracts(household_id, end_date);

create unique index if not exists document_reviews_document_id_unique_idx
  on public.document_reviews(document_id);

create table if not exists public.contract_radar_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signal_key text not null,
  title text not null,
  detail text not null,
  tone text not null check (tone in ('attention', 'info')),
  rule_version text not null default 'v1',
  observed_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (contract_id, signal_key, rule_version)
);

create index if not exists contract_radar_history_household_idx
  on public.contract_radar_history(household_id, observed_at desc);

alter table public.contract_radar_history enable row level security;
drop policy if exists "contract_radar_history_owner_all" on public.contract_radar_history;
create policy "contract_radar_history_owner_all"
on public.contract_radar_history
for all
to authenticated
using (
  exists (
    select 1 from public.households h
    where h.id = contract_radar_history.household_id
      and h.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.households h
    where h.id = contract_radar_history.household_id
      and h.owner_id = (select auth.uid())
  )
);

-- Table present in production but absent from remote migration history.
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

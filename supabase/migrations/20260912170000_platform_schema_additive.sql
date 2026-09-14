-- Additive VZGplattform schema for the Frankfurt Supabase project.
-- Does not copy source data and does not alter or delete VZGoffice tables.
-- Conflicting office table names are namespaced as platform_*.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mein Haushalt',
  country text not null default 'DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists households_owner_id_idx on public.households(owner_id);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  website text,
  customer_service_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  category text not null,
  title text not null,
  provider_name text not null,
  customer_number text,
  contract_number text,
  status text not null default 'draft',
  start_date date,
  minimum_term_end date,
  cancellation_notice_value integer,
  cancellation_notice_unit text,
  cancellation_deadline date,
  renewal_date date,
  monthly_amount numeric(12,2),
  currency text not null default 'EUR',
  payment_interval text,
  notes text,
  document_id uuid,
  review_status text not null default 'needs_review',
  extraction_confidence numeric(5,4),
  extracted_facts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create index if not exists contracts_household_id_idx on public.contracts(household_id);
create index if not exists contracts_status_idx on public.contracts(status);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  document_type text not null default 'other',
  processing_status text not null default 'uploaded',
  extracted_text text,
  extraction_status text not null default 'not_started',
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_household_id_idx on public.documents(household_id);
create index if not exists documents_contract_id_idx on public.documents(contract_id);

alter table public.contracts
  add constraint contracts_document_id_fkey foreign key (document_id) references public.documents(id) on delete set null;

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  source text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists deadlines_user_due_idx on public.deadlines(user_id, due_at);

create table if not exists public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  employment_status text,
  household_size integer,
  monthly_income numeric,
  monthly_fixed_costs numeric,
  data jsonb not null default '{}'::jsonb,
  completeness integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists preferred_language text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists employment_status text,
  add column if not exists household_size integer,
  add column if not exists monthly_income numeric,
  add column if not exists monthly_fixed_costs numeric,
  add column if not exists completeness integer not null default 0;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  relationship text,
  birth_year integer,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  status text not null default 'draft',
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  status text not null default 'draft',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  category text,
  monthly_cost numeric,
  status text not null default 'needs_data',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benefit_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  benefit_type text,
  status text not null default 'eligibility_check',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.official_sources (
  source_id text primary key,
  tax_year integer not null,
  source_kind text not null,
  fms_id text,
  official_url text not null,
  official_title text not null,
  retrieval_status text not null default 'SOURCE_RETRIEVAL_BLOCKED',
  retrieved_at timestamptz not null default now(),
  blocking_reason text,
  required_next_action text
);

create table if not exists public.tax_form_registry (
  id uuid primary key default gen_random_uuid(),
  official_name text not null,
  form_identifier text not null,
  tax_year integer not null,
  form_version text not null,
  official_source text,
  official_file text,
  required_or_conditional text not null,
  verification_status text not null default 'UNVERIFIED',
  mapping_status text not null default 'NOT_STARTED',
  technical_pdf_status text not null default 'NOT_AVAILABLE',
  registry_status text not null default 'AVAILABLE',
  source_retrieval_status text not null default 'SOURCE_RETRIEVAL_BLOCKED',
  source_id text references public.official_sources(source_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finanzamt_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  subject text not null,
  text text not null,
  attachments_metadata jsonb not null default '[]'::jsonb,
  linked_tax_return_id uuid references public.tax_cases(id) on delete set null,
  status text not null default 'DRAFT',
  future_elster_transaction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_integrations (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  display_name text not null,
  capability_status text not null default 'NOT_AVAILABLE',
  integration_version text not null default '1.0',
  availability text not null default 'PLANNED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_submission_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  declaration_reference text not null,
  provider_id uuid not null references public.provider_integrations(id),
  lifecycle_status text not null default 'DRAFT',
  idempotency_key text not null unique,
  payload_fingerprint text not null,
  correlation_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_submission_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.provider_submission_attempts(id) on delete cascade,
  event_type text not null,
  redacted_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_receipts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.provider_submission_attempts(id) on delete cascade,
  provider_receipt_id text not null,
  receipt_timestamp timestamptz not null,
  response_classification text not null,
  redacted_response_metadata jsonb not null default '{}'::jsonb,
  evidence_reference text,
  created_at timestamptz not null default now()
);

-- Conflicting VZGoffice names remain untouched; platform equivalents are isolated.
create table if not exists public.platform_cases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  title text not null,
  category text not null default 'general',
  description text,
  status text not null default 'draft',
  priority text not null default 'normal',
  due_date date,
  user_intent text,
  missing_information jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  case_id uuid references public.platform_cases(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open',
  due_at timestamptz,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_correspondence_drafts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  case_id uuid not null references public.platform_cases(id) on delete cascade,
  language text not null default 'de',
  recipient_name text,
  recipient_email text,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  generated_by text not null default 'user',
  evidence_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_approvals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  case_id uuid not null references public.platform_cases(id) on delete cascade,
  draft_id uuid references public.platform_correspondence_drafts(id) on delete cascade,
  action_type text not null,
  action_summary text not null,
  status text not null default 'pending',
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  event_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.platform_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare r record; begin
  for r in select unnest(array['households','providers','contracts','financial_profiles','opportunity_checks','tax_cases','contract_reviews','benefit_cases','tax_form_registry','finanzamt_requests','provider_integrations','provider_submission_attempts','platform_cases','platform_tasks','platform_correspondence_drafts','platform_approvals']) as table_name loop
    execute format('drop trigger if exists %I_updated_at on public.%I', r.table_name, r.table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.platform_updated_at()', r.table_name, r.table_name);
  end loop;
end $$;

-- RLS: owner access only. Reference sources are readable by authenticated users.
do $$ declare r record; begin
  for r in select unnest(array['households','providers','contracts','documents','deadlines','financial_profiles','family_members','opportunity_checks','tax_cases','contract_reviews','benefit_cases','finanzamt_requests','provider_integrations','provider_submission_attempts','provider_submission_events','provider_receipts','platform_cases','platform_tasks','platform_correspondence_drafts','platform_approvals','platform_audit_events']) as table_name loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;
end $$;
alter table public.official_sources enable row level security;
alter table public.tax_form_registry enable row level security;

create policy households_owner_all on public.households for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy providers_read_authenticated on public.providers for select to authenticated using (true);
create policy contracts_household_owner_all on public.contracts for all to authenticated using (exists (select 1 from public.households h where h.id = contracts.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = contracts.household_id and h.owner_id = (select auth.uid())));
create policy documents_household_owner_all on public.documents for all to authenticated using (exists (select 1 from public.households h where h.id = documents.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = documents.household_id and h.owner_id = (select auth.uid())));
create policy deadlines_owner_all on public.deadlines for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy financial_profiles_owner_all on public.financial_profiles for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy family_members_owner_all on public.family_members for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy opportunity_checks_owner_all on public.opportunity_checks for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tax_cases_owner_all on public.tax_cases for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy contract_reviews_owner_all on public.contract_reviews for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy benefit_cases_owner_all on public.benefit_cases for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy finanzamt_requests_owner_all on public.finanzamt_requests for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy provider_integrations_read_authenticated on public.provider_integrations for select to authenticated using (true);
create policy provider_attempts_owner_all on public.provider_submission_attempts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy provider_events_owner_read on public.provider_submission_events for select to authenticated using (exists (select 1 from public.provider_submission_attempts a where a.id = provider_submission_events.attempt_id and a.user_id = (select auth.uid())));
create policy provider_receipts_owner_read on public.provider_receipts for select to authenticated using (exists (select 1 from public.provider_submission_attempts a where a.id = provider_receipts.attempt_id and a.user_id = (select auth.uid())));
create policy platform_cases_household_owner_all on public.platform_cases for all to authenticated using (exists (select 1 from public.households h where h.id = platform_cases.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = platform_cases.household_id and h.owner_id = (select auth.uid())));
create policy platform_tasks_household_owner_all on public.platform_tasks for all to authenticated using (exists (select 1 from public.households h where h.id = platform_tasks.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = platform_tasks.household_id and h.owner_id = (select auth.uid())));
create policy platform_drafts_household_owner_all on public.platform_correspondence_drafts for all to authenticated using (exists (select 1 from public.households h where h.id = platform_correspondence_drafts.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = platform_correspondence_drafts.household_id and h.owner_id = (select auth.uid())));
create policy platform_approvals_household_owner_all on public.platform_approvals for all to authenticated using (exists (select 1 from public.households h where h.id = platform_approvals.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = platform_approvals.household_id and h.owner_id = (select auth.uid())));
create policy platform_audit_household_owner_all on public.platform_audit_events for all to authenticated using (exists (select 1 from public.households h where h.id = platform_audit_events.household_id and h.owner_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = platform_audit_events.household_id and h.owner_id = (select auth.uid())));
create policy official_sources_read_authenticated on public.official_sources for select to authenticated using (true);
create policy tax_form_registry_read_authenticated on public.tax_form_registry for select to authenticated using (true);

grant select, insert, update, delete on table
  public.households,
  public.providers,
  public.contracts,
  public.documents,
  public.deadlines,
  public.financial_profiles,
  public.family_members,
  public.opportunity_checks,
  public.tax_cases,
  public.contract_reviews,
  public.benefit_cases,
  public.official_sources,
  public.tax_form_registry,
  public.finanzamt_requests,
  public.provider_integrations,
  public.provider_submission_attempts,
  public.provider_submission_events,
  public.provider_receipts,
  public.platform_cases,
  public.platform_tasks,
  public.platform_correspondence_drafts,
  public.platform_approvals,
  public.platform_audit_events
to authenticated;

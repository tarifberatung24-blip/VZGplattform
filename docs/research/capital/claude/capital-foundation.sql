-- VZG Capital foundation: additive, versioned, and household-isolated.
-- Aladdin/ADC data is optional and never required by these tables.

create or replace function public.capital_is_advisor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'advisor';
$$;

create table if not exists public.advisor_clients (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references auth.users(id) on delete restrict,
  target_household_id uuid references public.households(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  address text,
  notes text,
  status text not null default 'new' check (status in ('new','in_analysis','analysis_complete','published')),
  consent_status text not null default 'pending' check (consent_status in ('pending','granted','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advisor_clients_advisor_user_id_idx on public.advisor_clients(advisor_user_id);
create index if not exists advisor_clients_target_household_id_idx on public.advisor_clients(target_household_id);
create index if not exists advisor_clients_status_idx on public.advisor_clients(status);

create table if not exists public.financial_analyses (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  locale text not null default 'de' check (locale in ('bg','de')),
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','superseded')),
  completed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  source_document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (advisor_client_id, version)
);
create index if not exists financial_analyses_client_idx on public.financial_analyses(advisor_client_id, version desc);

create table if not exists public.financial_analysis_answers (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.financial_analyses(id) on delete cascade,
  section_key text not null,
  field_key text not null,
  boolean_value boolean,
  amount_value numeric(14,2),
  currency text check (currency is null or length(currency) = 3),
  text_value text,
  notes text,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (analysis_id, section_key, field_key)
);
create index if not exists financial_analysis_answers_analysis_idx on public.financial_analysis_answers(analysis_id);

create table if not exists public.capital_goals (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete cascade,
  goal_type text not null,
  title text not null,
  target_amount numeric(14,2),
  currency text not null default 'EUR' check (length(currency) = 3),
  target_date date,
  priority integer not null default 3 check (priority between 1 and 5),
  assumptions jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists capital_goals_client_idx on public.capital_goals(advisor_client_id, status);

create table if not exists public.advisor_documents (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  original_filename text not null,
  storage_path text,
  document_type text not null default 'contract',
  created_at timestamptz not null default now()
);
create index if not exists advisor_documents_client_idx on public.advisor_documents(advisor_client_id);

create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  advisor_document_id uuid not null references public.advisor_documents(id) on delete cascade,
  extraction_version text not null,
  status text not null default 'needs_review' check (status in ('processing','needs_review','approved','rejected')),
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  evidence jsonb not null default '[]'::jsonb,
  model_name text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists document_extractions_document_idx on public.document_extractions(advisor_document_id, created_at desc);

create table if not exists public.capital_strategies (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete cascade,
  analysis_id uuid not null references public.financial_analyses(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','superseded')),
  engine_version text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '{}'::jsonb,
  disclaimer_version text not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (advisor_client_id, version)
);
create index if not exists capital_strategies_client_idx on public.capital_strategies(advisor_client_id, version desc);

create table if not exists public.capital_strategy_scenarios (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.capital_strategies(id) on delete cascade,
  scenario_key text not null check (scenario_key in ('conservative','balanced','growth')),
  monthly_surplus numeric(14,2),
  emergency_reserve_target numeric(14,2),
  projected_goal_amount numeric(14,2),
  allocation jsonb not null default '{}'::jsonb,
  feasibility text not null default 'needs_data' check (feasibility in ('needs_data','not_feasible','feasible','review_required')),
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (strategy_id, scenario_key)
);
create index if not exists capital_strategy_scenarios_strategy_idx on public.capital_strategy_scenarios(strategy_id);

create table if not exists public.capital_roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.capital_strategies(id) on delete cascade,
  title text not null,
  metric text not null,
  target_value numeric(14,2),
  target_date date,
  achieved_at timestamptz,
  customer_copy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists capital_roadmap_strategy_idx on public.capital_roadmap_milestones(strategy_id, target_date);

create table if not exists public.capital_external_sources (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete cascade,
  source_system text not null,
  endpoint_class text,
  external_record_id text,
  retrieved_at timestamptz not null,
  source_version text,
  query_hash text,
  units text,
  currency text check (currency is null or length(currency) = 3),
  freshness_status text not null default 'unknown' check (freshness_status in ('fresh','stale','unknown','rejected')),
  normalized_value jsonb not null default '{}'::jsonb,
  reviewer_status text not null default 'unreviewed' check (reviewer_status in ('unreviewed','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists capital_external_sources_client_idx on public.capital_external_sources(advisor_client_id, retrieved_at desc);

create table if not exists public.capital_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid not null references public.advisor_clients(id) on delete restrict,
  target_household_id uuid not null references public.households(id) on delete restrict,
  analysis_id uuid not null references public.financial_analyses(id) on delete restrict,
  strategy_id uuid not null references public.capital_strategies(id) on delete restrict,
  schema_version text not null,
  payload_hash text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','published','failed','cancelled')),
  error_code text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists capital_publish_jobs_target_idx on public.capital_publish_jobs(target_household_id, created_at desc);

create table if not exists public.capital_audit_events (
  id uuid primary key default gen_random_uuid(),
  advisor_client_id uuid references public.advisor_clients(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  event_type text not null,
  event_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists capital_audit_events_client_idx on public.capital_audit_events(advisor_client_id, created_at desc);

create table if not exists public.household_capital_profiles (
  household_id uuid primary key references public.households(id) on delete cascade,
  enabled boolean not null default false,
  risk_profile text check (risk_profile is null or risk_profile in ('conservative','balanced','growth')),
  plan_status text not null default 'not_started' check (plan_status in ('not_started','in_review','active','paused','completed')),
  disclaimer_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_capital_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  published_strategy_id uuid references public.capital_strategies(id) on delete set null,
  effective_date date not null,
  monthly_income numeric(14,2),
  monthly_fixed_costs numeric(14,2),
  monthly_surplus numeric(14,2),
  currency text not null default 'EUR' check (length(currency) = 3),
  source text not null default 'advisor_approved',
  created_at timestamptz not null default now()
);
create index if not exists household_capital_snapshots_household_idx on public.household_capital_snapshots(household_id, effective_date desc);

create table if not exists public.household_capital_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_goal_id uuid references public.capital_goals(id) on delete set null,
  title text not null,
  goal_type text not null,
  target_amount numeric(14,2),
  currency text not null default 'EUR' check (length(currency) = 3),
  target_date date,
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'active' check (status in ('active','achieved','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists household_capital_goals_household_idx on public.household_capital_goals(household_id, status);

create table if not exists public.household_capital_strategies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_strategy_id uuid references public.capital_strategies(id) on delete set null,
  version integer not null check (version > 0),
  strategy_key text not null check (strategy_key in ('conservative','balanced','growth')),
  status text not null default 'published' check (status in ('published','superseded')),
  assumptions jsonb not null default '{}'::jsonb,
  scenario jsonb not null default '{}'::jsonb,
  disclaimer_version text not null,
  published_at timestamptz not null default now(),
  unique (household_id, version, strategy_key)
);
create index if not exists household_capital_strategies_household_idx on public.household_capital_strategies(household_id, version desc);

create table if not exists public.household_capital_milestones (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_milestone_id uuid references public.capital_roadmap_milestones(id) on delete set null,
  title text not null,
  metric text not null,
  target_value numeric(14,2),
  current_value numeric(14,2),
  target_date date,
  achieved_at timestamptz,
  status text not null default 'open' check (status in ('open','achieved','paused')),
  customer_copy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists household_capital_milestones_household_idx on public.household_capital_milestones(household_id, target_date);

create table if not exists public.household_capital_updates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  milestone_id uuid references public.household_capital_milestones(id) on delete cascade,
  update_type text not null,
  previous_value numeric(14,2),
  new_value numeric(14,2),
  currency text check (currency is null or length(currency) = 3),
  note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists household_capital_updates_household_idx on public.household_capital_updates(household_id, created_at desc);

-- Shared updated_at trigger.
 do $$ declare r record; begin
  for r in select unnest(array[
    'advisor_clients','financial_analyses','financial_analysis_answers','capital_goals',
    'document_extractions','capital_strategies','capital_publish_jobs',
    'household_capital_profiles','household_capital_goals','household_capital_milestones'
  ]) as table_name loop
    execute format('drop trigger if exists %I_updated_at on public.%I', r.table_name, r.table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.platform_updated_at()', r.table_name, r.table_name);
  end loop;
end $$;

-- Strict RLS: advisor-owned records require the advisor JWT role claim.
 do $$ declare r record; begin
  for r in select unnest(array[
    'advisor_clients','financial_analyses','financial_analysis_answers','capital_goals',
    'advisor_documents','document_extractions','capital_strategies','capital_strategy_scenarios',
    'capital_roadmap_milestones','capital_external_sources','capital_publish_jobs','capital_audit_events'
  ]) as table_name loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;
end $$;

create policy advisor_clients_advisor_all on public.advisor_clients for all to authenticated
  using (public.capital_is_advisor() and advisor_user_id = (select auth.uid()))
  with check (public.capital_is_advisor() and advisor_user_id = (select auth.uid()));

create policy financial_analyses_advisor_all on public.financial_analyses for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy financial_analysis_answers_advisor_all on public.financial_analysis_answers for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.financial_analyses a join public.advisor_clients c on c.id = a.advisor_client_id where a.id = analysis_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.financial_analyses a join public.advisor_clients c on c.id = a.advisor_client_id where a.id = analysis_id and c.advisor_user_id = (select auth.uid())));

create policy capital_goals_advisor_all on public.capital_goals for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy advisor_documents_advisor_all on public.advisor_documents for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy document_extractions_advisor_all on public.document_extractions for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_documents d join public.advisor_clients c on c.id = d.advisor_client_id where d.id = advisor_document_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_documents d join public.advisor_clients c on c.id = d.advisor_client_id where d.id = advisor_document_id and c.advisor_user_id = (select auth.uid())));

create policy capital_strategies_advisor_all on public.capital_strategies for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy capital_strategy_scenarios_advisor_all on public.capital_strategy_scenarios for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.capital_strategies s join public.advisor_clients c on c.id = s.advisor_client_id where s.id = strategy_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.capital_strategies s join public.advisor_clients c on c.id = s.advisor_client_id where s.id = strategy_id and c.advisor_user_id = (select auth.uid())));

create policy capital_roadmap_advisor_all on public.capital_roadmap_milestones for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.capital_strategies s join public.advisor_clients c on c.id = s.advisor_client_id where s.id = strategy_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.capital_strategies s join public.advisor_clients c on c.id = s.advisor_client_id where s.id = strategy_id and c.advisor_user_id = (select auth.uid())));

create policy capital_external_sources_advisor_all on public.capital_external_sources for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy capital_publish_jobs_advisor_all on public.capital_publish_jobs for all to authenticated
  using (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())))
  with check (public.capital_is_advisor() and exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid())));

create policy capital_audit_advisor_select on public.capital_audit_events for select to authenticated
  using (public.capital_is_advisor() and (actor_user_id = (select auth.uid()) or exists (select 1 from public.advisor_clients c where c.id = advisor_client_id and c.advisor_user_id = (select auth.uid()))));

-- Customer records are readable by the owning household only. Writes are server-controlled,
-- except progress updates, which are limited to the owning authenticated user.
 do $$ declare r record; begin
  for r in select unnest(array[
    'household_capital_profiles','household_capital_snapshots','household_capital_goals',
    'household_capital_strategies','household_capital_milestones','household_capital_updates'
  ]) as table_name loop
    execute format('alter table public.%I enable row level security', r.table_name);
  end loop;
end $$;

create policy household_capital_profiles_owner_select on public.household_capital_profiles for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy household_capital_snapshots_owner_select on public.household_capital_snapshots for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy household_capital_goals_owner_select on public.household_capital_goals for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy household_capital_strategies_owner_select on public.household_capital_strategies for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy household_capital_milestones_owner_select on public.household_capital_milestones for select to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));
create policy household_capital_updates_owner_all on public.household_capital_updates for all to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid()))) with check (created_by = (select auth.uid()) and exists (select 1 from public.households h where h.id = household_id and h.owner_id = (select auth.uid())));

revoke all on function public.capital_is_advisor() from public, anon;
grant execute on function public.capital_is_advisor() to authenticated;

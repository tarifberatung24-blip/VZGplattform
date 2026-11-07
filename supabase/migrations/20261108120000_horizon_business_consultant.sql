-- HORIZON Business Consultant — additive persistence.
--
-- NOT YET APPLIED TO PRODUCTION. This file lives in supabase/migrations/ so it
-- follows the reviewed, additive migration flow the owner applies through the
-- Supabase migration history (there is no CI migration runner). Applying it is an
-- owner decision. Validate first with the rollback-only script in
-- supabase/tests/rls/horizon_business_consultant_isolation.sql against a
-- disposable project.
--
-- WHAT THIS IS
-- Four additive tables that turn the Business Profile MVP into a working
-- consultant workspace:
--   * business_diagnoses     — one evidence-classified AI diagnosis per profile,
--   * business_playbook_actions — the 30/60/90-day actions and their user-driven
--                               status (complete / postpone / reject),
--   * business_documents     — the link between an existing uploaded document and
--                               the business workspace (no document content is
--                               duplicated; `source_documents` stays canonical),
--   * business_finance_entries — manually entered or document-derived money lines,
--                               each carrying its own evidence source.
--
-- It introduces no second source of truth. Every row references existing HORIZON
-- entities by id: `business_profiles(id)`, `cases(id)`, `source_documents(id)`.
-- It duplicates no case, document, fact, draft or audit data, and it adds no new
-- agent execution engine — runs continue to use the merged Agent Runs Engine.
--
-- RLS: enabled on all four tables, owner-scoped, no delete policy, no anon access.
-- The owner column is `owner_id` everywhere and every policy pins it to
-- `auth.uid()`, matching the Agent Runs Engine and the Business Profile MVP.
--
-- COMPOSITE FK PREREQUISITES
-- The composite foreign keys below bind (child_id, owner_id) to
-- (parent_id, owner_id), which is what makes cross-owner attachment impossible in
-- the database rather than only in application code. Postgres requires a unique
-- constraint on exactly that pair, so this migration adds the missing ones to
-- `business_profiles` (the MVP created it with `unique (owner_id)` only) and to
-- `source_documents` (which currently has `unique (id, case_id, owner_id)`).
-- Both additions are idempotent and non-destructive: adding a unique constraint
-- cannot drop or rewrite a row.

-- ---------------------------------------------------------------------------
-- Composite-FK prerequisites on existing tables.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.business_profiles'::regclass
      and conname = 'business_profiles_id_owner'
  ) then
    alter table public.business_profiles
      add constraint business_profiles_id_owner unique (id, owner_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.source_documents'::regclass
      and conname = 'source_documents_id_owner'
  ) then
    alter table public.source_documents
      add constraint source_documents_id_owner unique (id, owner_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Module A completion: business services / tools on the existing profile.
-- Additive columns on the MVP table; the profile row is never rewritten.
-- Declared `text[]` to match the sibling `business_goals` / `business_challenges`
-- columns the MVP already created, so the whole profile reads back the same shape.
-- ---------------------------------------------------------------------------
alter table public.business_profiles
  add column if not exists business_services text[] not null default '{}',
  add column if not exists business_tools text[] not null default '{}';

comment on column public.business_profiles.business_services is
  'The services the business actually sells. Free-form labels; used by the diagnosis, never invented by it.';
comment on column public.business_profiles.business_tools is
  'The software/tools the business already uses, so the diagnosis does not recommend what is already in place.';

-- ---------------------------------------------------------------------------
-- business_diagnoses — the evidence-classified AI diagnosis for one profile.
-- ---------------------------------------------------------------------------
create table if not exists public.business_diagnoses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null,
  -- The Agent Run that produced this diagnosis, when one was used. Nullable so a
  -- diagnosis can be recorded even if the engine is not installed yet.
  run_id uuid,
  trace_id uuid not null default gen_random_uuid(),
  status text not null default 'ready' check (status in ('ready','superseded')),
  -- The model + prompt provenance, exactly as the AI registry declares it.
  model text not null,
  prompt_version text not null,
  -- The whole diagnosis, structured: overview, strengths, weaknesses, bottlenecks,
  -- opportunities, risks, missing information and prioritised recommendations.
  -- Every finding carries its own evidence classification. Stored as jsonb so the
  -- shape can grow without a destructive migration.
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  -- Which input references the diagnosis was built from (profile, documents, case).
  input_references jsonb not null default '[]'::jsonb check (jsonb_typeof(input_references) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A diagnosis cannot be attached to another owner's business profile.
  constraint business_diagnoses_profile_owner_fk
    foreign key (profile_id, owner_id) references public.business_profiles(id, owner_id) on delete cascade,
  -- Required by the composite FK above; Postgres needs a unique key on the pair.
  constraint business_diagnoses_id_owner unique (id, owner_id)
);

-- The producing run is a plain single-column FK with `on delete set null`: the
-- owner column is NOT NULL, so a composite (run_id, owner_id) FK with `set null`
-- could never satisfy itself. Ownership is still enforced because `run_id` is
-- only ever written server-side from a run the same owner owns.
do $$
begin
  if to_regclass('public.agent_runs') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.business_diagnoses'::regclass
         and conname = 'business_diagnoses_run_fk'
     )
  then
    alter table public.business_diagnoses
      add constraint business_diagnoses_run_fk
      foreign key (run_id) references public.agent_runs(id) on delete set null;
  end if;
end;
$$;

comment on table public.business_diagnoses is
  'HORIZON Business Consultant: one evidence-classified AI diagnosis per business profile. References business_profiles and (optionally) agent_runs; duplicates no case or document data.';
comment on column public.business_diagnoses.content is
  'Structured diagnosis. Every finding carries an evidence class: verified fact, user-provided, AI assumption or requires external verification.';

create index if not exists business_diagnoses_owner_created_idx
  on public.business_diagnoses(owner_id, created_at desc);
create index if not exists business_diagnoses_profile_idx
  on public.business_diagnoses(profile_id, created_at desc);
-- At most one live diagnosis per profile; a regeneration supersedes the old one.
-- The index is owner-qualified on purpose: a bare `(profile_id)` index would be
-- checked before the composite FK, so inserting a *foreign* profile id would raise
-- a unique violation and leak the existence of another owner's diagnosis. With
-- `(owner_id, profile_id)` the collision cannot occur across tenants and the FK
-- is the constraint that reports the refusal.
create unique index if not exists business_diagnoses_profile_live_idx
  on public.business_diagnoses(owner_id, profile_id) where status = 'ready';

-- ---------------------------------------------------------------------------
-- business_playbook_actions — the 30/60/90-day actions.
-- ---------------------------------------------------------------------------
create table if not exists public.business_playbook_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null,
  diagnosis_id uuid,
  -- 30 / 60 / 90 day horizon.
  horizon integer not null check (horizon in (30,60,90)),
  -- Stable key so a regenerated plan updates the same action rather than duplicating.
  action_key text not null check (char_length(action_key) between 1 and 120),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  effort text not null default 'medium' check (effort in ('low','medium','high')),
  expected_benefit text not null default '',
  required_documents jsonb not null default '[]'::jsonb check (jsonb_typeof(required_documents) = 'array'),
  dependencies jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies) = 'array'),
  -- Deterministic date only; the engine never invents a deadline.
  deadline date,
  responsible text not null default 'user' check (responsible in ('user','horizon','partner')),
  -- Whether completing the action needs an explicit user approval first.
  approval_required boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','postponed','rejected')),
  -- When the user postponed the action, the new date is recorded here.
  postponed_until date,
  -- Evidence classification for the action's premise, same vocabulary as findings.
  evidence_class text not null default 'recommendation'
    check (evidence_class in ('verified_fact','user_provided','ai_assumption','requires_external_verification','recommendation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_playbook_actions_profile_owner_fk
    foreign key (profile_id, owner_id) references public.business_profiles(id, owner_id) on delete cascade,
  -- One action row per (profile, horizon, key): regenerating the plan updates.
  -- Owner-qualified for the same reason as the diagnosis index above.
  constraint business_playbook_actions_profile_key unique (owner_id, profile_id, horizon, action_key)
);

-- Same reasoning as `business_diagnoses_run_fk`: a nullable parent link with a
-- NOT NULL owner column cannot use a composite `set null` FK.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.business_playbook_actions'::regclass
      and conname = 'business_playbook_actions_diagnosis_fk'
  ) then
    alter table public.business_playbook_actions
      add constraint business_playbook_actions_diagnosis_fk
      foreign key (diagnosis_id) references public.business_diagnoses(id) on delete set null;
  end if;
end;
$$;

comment on table public.business_playbook_actions is
  'HORIZON Business Consultant: the personalised 30/60/90-day actions. Status is user-driven (complete / postpone / reject); the engine never completes an action for the user.';

create index if not exists business_playbook_actions_owner_status_idx
  on public.business_playbook_actions(owner_id, status);
create index if not exists business_playbook_actions_profile_idx
  on public.business_playbook_actions(profile_id, horizon);

-- ---------------------------------------------------------------------------
-- business_documents — link an uploaded document to the business workspace.
-- ---------------------------------------------------------------------------
create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null,
  -- The canonical uploaded document. `source_documents` stays the source of truth
  -- for the file; this row only records the business-workspace association.
  document_id uuid not null,
  -- Optional secondary link to a case. Plain FK with `set null` (the owner column
  -- is NOT NULL, so a composite `set null` FK cannot be used here); the case id is
  -- validated against an owned case server-side before it is written.
  case_id uuid,
  category text not null default 'other'
    check (category in (
      'gewerbeanmeldung','tax','invoice','contract','insurance','supplier',
      'bank_statement','e_invoice','other'
    )),
  -- Business-relevant dates, when the document carries them (renewal, expiry, due).
  expires_on date,
  renewal_on date,
  -- A short AI summary, if generated. Text only; the file itself is never copied.
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_documents_profile_owner_fk
    foreign key (profile_id, owner_id) references public.business_profiles(id, owner_id) on delete cascade,
  -- Composite cascade: a document belongs to exactly one owner, so cross-owner
  -- linking is impossible in the database, and removing the document removes the
  -- business-workspace association with it.
  constraint business_documents_document_owner_fk
    foreign key (document_id, owner_id) references public.source_documents(id, owner_id) on delete cascade,
  -- A document is linked to a business profile at most once.
  -- Owner-qualified: see the note on the diagnosis live index.
  constraint business_documents_profile_document unique (owner_id, profile_id, document_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.business_documents'::regclass
      and conname = 'business_documents_case_fk'
  ) then
    alter table public.business_documents
      add constraint business_documents_case_fk
      foreign key (case_id) references public.cases(id) on delete set null;
  end if;
end;
$$;

comment on table public.business_documents is
  'HORIZON Business Consultant: association between an uploaded document (source_documents, canonical) and the business workspace. No document content is duplicated here.';

create index if not exists business_documents_owner_category_idx
  on public.business_documents(owner_id, category);
create index if not exists business_documents_profile_idx
  on public.business_documents(profile_id, created_at desc);
create index if not exists business_documents_renewal_idx
  on public.business_documents(owner_id, renewal_on)
  where renewal_on is not null;

-- ---------------------------------------------------------------------------
-- business_finance_entries — evidenced money lines for the cash-flow view.
-- ---------------------------------------------------------------------------
create table if not exists public.business_finance_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null,
  -- The document this figure came from, when it was extracted rather than typed.
  document_id uuid,
  kind text not null check (kind in ('revenue','expense')),
  category text not null default 'other'
    check (category in (
      'revenue_sales','revenue_services','revenue_other',
      'expense_personnel','expense_materials','expense_rent','expense_insurance',
      'expense_software','expense_travel','expense_tax_advice','expense_other'
    )),
  -- Cents, integer, never a float. Sign is implied by `kind`.
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  -- The month the figure belongs to, first day, for a deterministic monthly view.
  period_month date not null,
  description text not null default '' check (char_length(description) <= 500),
  recurring boolean not null default false,
  -- Where the number came from. A manual entry and a document-derived figure are
  -- never presented as the same thing.
  source text not null check (source in ('manual','document','invoice')),
  -- Evidence class for the figure, mirroring the diagnosis vocabulary.
  evidence_class text not null
    check (evidence_class in ('verified_fact','user_provided','ai_assumption')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_finance_entries_profile_owner_fk
    foreign key (profile_id, owner_id) references public.business_profiles(id, owner_id) on delete cascade
);

-- Nullable document link, plain `set null` FK (see the note on business_documents).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.business_finance_entries'::regclass
      and conname = 'business_finance_entries_document_fk'
  ) then
    alter table public.business_finance_entries
      add constraint business_finance_entries_document_fk
      foreign key (document_id) references public.source_documents(id) on delete set null;
  end if;
end;
$$;

comment on table public.business_finance_entries is
  'HORIZON Business Consultant: evidenced revenue and expense lines. A manual entry and a document-derived figure are distinguished by `source`; figures are never invented.';

create index if not exists business_finance_entries_owner_period_idx
  on public.business_finance_entries(owner_id, period_month desc);
create index if not exists business_finance_entries_profile_idx
  on public.business_finance_entries(profile_id, period_month desc);

-- ---------------------------------------------------------------------------
-- RLS: enabled, owner-scoped, no delete policy, no anon access.
-- ---------------------------------------------------------------------------
alter table public.business_diagnoses enable row level security;
alter table public.business_playbook_actions enable row level security;
alter table public.business_documents enable row level security;
alter table public.business_finance_entries enable row level security;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('business_diagnoses',        'business_diagnoses_owner_select'),
      ('business_playbook_actions', 'business_playbook_actions_owner_select'),
      ('business_documents',        'business_documents_owner_select'),
      ('business_finance_entries',  'business_finance_entries_owner_select')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('business_diagnoses',        'business_diagnoses_owner_insert'),
      ('business_playbook_actions', 'business_playbook_actions_owner_insert'),
      ('business_documents',        'business_documents_owner_insert'),
      ('business_finance_entries',  'business_finance_entries_owner_insert')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('business_diagnoses',        'business_diagnoses_owner_update'),
      ('business_playbook_actions', 'business_playbook_actions_owner_update'),
      ('business_documents',        'business_documents_owner_update'),
      ('business_finance_entries',  'business_finance_entries_owner_update')
    ) as t(table_name, policy_name)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
        target.policy_name, target.table_name
      );
    end if;
  end loop;
end;
$$;

-- Explicit grants: authenticated may read and write its own rows; anon gets
-- nothing. Column-level insert/update grants keep `id`, `owner_id` ownership
-- enforcement intact and mirror the Business Profile MVP migration.
-- Module A: the new profile columns need the same column grants as the MVP ones.
grant insert (business_services, business_tools) on public.business_profiles to authenticated;
grant update (business_services, business_tools) on public.business_profiles to authenticated;

grant select on public.business_diagnoses to authenticated;
grant insert (owner_id, profile_id, run_id, trace_id, status, model, prompt_version, content, input_references, updated_at) on public.business_diagnoses to authenticated;
grant update (status, content, input_references, updated_at) on public.business_diagnoses to authenticated;

grant select on public.business_playbook_actions to authenticated;
grant insert (owner_id, profile_id, diagnosis_id, horizon, action_key, title, description, priority, effort, expected_benefit, required_documents, dependencies, deadline, responsible, approval_required, status, evidence_class, updated_at) on public.business_playbook_actions to authenticated;
grant update (title, description, priority, effort, expected_benefit, required_documents, dependencies, deadline, responsible, approval_required, status, postponed_until, updated_at) on public.business_playbook_actions to authenticated;

grant select on public.business_documents to authenticated;
grant insert (owner_id, profile_id, document_id, case_id, category, expires_on, renewal_on, summary, updated_at) on public.business_documents to authenticated;
grant update (category, expires_on, renewal_on, summary, case_id, updated_at) on public.business_documents to authenticated;

grant select on public.business_finance_entries to authenticated;
grant insert (owner_id, profile_id, document_id, kind, category, amount_cents, currency, period_month, description, recurring, source, evidence_class, updated_at) on public.business_finance_entries to authenticated;
grant update (category, amount_cents, period_month, description, recurring, source, evidence_class, updated_at) on public.business_finance_entries to authenticated;

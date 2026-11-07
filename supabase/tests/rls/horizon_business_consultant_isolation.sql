-- HORIZON Business Consultant: ownership isolation.
--
-- Runs only against a disposable local/staging database after applying, in order:
--   1. supabase/migrations/20260909112037_kintex_assistant_baseline.sql
--   2. supabase/migrations/20260919150000_horizon_case_engine.sql
--   3. supabase/migrations/20261107000000_horizon_agent_runs_engine.sql
--   4. supabase/migrations/20261107120000_horizon_business_profiles.sql
--   5. supabase/migrations/20261108120000_horizon_business_consultant.sql
--
-- The minimal Supabase-like harness (roles, `auth.uid()`, `auth.role()`, a
-- `storage` stub) is in supabase/tests/rls/README_agent_runs_local_harness.sql.
-- Never run against the production project. The transaction always rolls back its
-- synthetic fixtures, so it leaves no rows behind.
--
-- This file proves database-level behaviour only. It is NOT a substitute for the
-- unit/contract tests; it is the real-database check the unit tests cannot make.
-- If it cannot be run, it is reported as not executed, not as passing.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('a0000000-0000-4000-8000-00000000000a', 'bc-a@example.invalid', 'authenticated', 'authenticated',
   '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', 'bc-b@example.invalid', 'authenticated', 'authenticated',
   '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

-- One business profile and one case per owner.
insert into public.business_profiles (id, owner_id, business_name, legal_form, industry)
values
  ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-00000000000a', 'Betrieb A', 'einzelunternehmen', 'Handwerk'),
  ('b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-00000000000b', 'Betrieb B', 'gmbh', 'IT');

insert into public.cases (id, owner_id, title, intent, horizon_status, horizon_module)
values
  ('a0000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-00000000000a', 'Case A', 'reply', 'collecting_data', 'general'),
  ('b0000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-00000000000b', 'Case B', 'reply', 'collecting_data', 'general');

-- One uploaded document per owner (source_documents is canonical for the file).
insert into public.source_documents (id, owner_id, case_id, path, mime, size_bytes, sha256)
values
  ('a0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1',
   'a0000000-0000-4000-8000-00000000000a/a0000000-0000-4000-8000-0000000000c1/a.pdf',
   'application/pdf', 1024, repeat('a', 64)),
  ('b0000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2',
   'b0000000-0000-4000-8000-00000000000b/b0000000-0000-4000-8000-0000000000c2/b.pdf',
   'application/pdf', 2048, repeat('b', 64));

-- Fixtures are inserted as the table owner so RLS is not a factor here; every
-- assertion below runs as `authenticated`.
insert into public.business_diagnoses (id, owner_id, profile_id, model, prompt_version, content)
values
  ('a0000000-0000-4000-8000-0000000000d1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000f1', 'openai/gpt-oss-20b', 'horizon-business-diagnosis-v1', '{"overview":"A"}'),
  ('b0000000-0000-4000-8000-0000000000d2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000f2', 'openai/gpt-oss-20b', 'horizon-business-diagnosis-v1', '{"overview":"B"}');

insert into public.business_playbook_actions (id, owner_id, profile_id, diagnosis_id, horizon, action_key, title)
values
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000d1', 30, 'tidy-books', 'Buchhaltung ordnen'),
  ('b0000000-0000-4000-8000-0000000000a2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000d2', 30, 'tidy-books', 'Buchhaltung ordnen');

insert into public.business_documents (id, owner_id, profile_id, document_id, category)
values
  ('a0000000-0000-4000-8000-0000000000c3', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1', 'invoice'),
  ('b0000000-0000-4000-8000-0000000000c4', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000e2', 'invoice');

insert into public.business_finance_entries (id, owner_id, profile_id, kind, category, amount_cents, period_month, source, evidence_class)
values
  ('a0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000f1', 'revenue', 'revenue_services', 250000, '2026-01-01', 'manual', 'user_provided'),
  ('b0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000f2', 'revenue', 'revenue_services', 990000, '2026-01-01', 'manual', 'user_provided');

-- ---------------------------------------------------------------------------
-- Customer A must see exactly their own row in every new table.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from public.business_diagnoses;
  if n <> 1 then raise exception 'BC_RLS_FAILED: A sees % diagnoses, expected 1', n; end if;

  select count(*) into n from public.business_playbook_actions;
  if n <> 1 then raise exception 'BC_RLS_FAILED: A sees % actions, expected 1', n; end if;

  select count(*) into n from public.business_documents;
  if n <> 1 then raise exception 'BC_RLS_FAILED: A sees % documents, expected 1', n; end if;

  select count(*) into n from public.business_finance_entries;
  if n <> 1 then raise exception 'BC_RLS_FAILED: A sees % finance entries, expected 1', n; end if;
end;
$$;

-- A must not read B's rows by primary key.
do $$
begin
  if exists (select 1 from public.business_diagnoses where id = 'b0000000-0000-4000-8000-0000000000d2') then
    raise exception 'BC_RLS_FAILED: A read B diagnosis by id';
  end if;
  if exists (select 1 from public.business_playbook_actions where id = 'b0000000-0000-4000-8000-0000000000a2') then
    raise exception 'BC_RLS_FAILED: A read B action by id';
  end if;
  if exists (select 1 from public.business_documents where id = 'b0000000-0000-4000-8000-0000000000c4') then
    raise exception 'BC_RLS_FAILED: A read B document link by id';
  end if;
  if exists (select 1 from public.business_finance_entries where id = 'b0000000-0000-4000-8000-0000000000b2') then
    raise exception 'BC_RLS_FAILED: A read B finance entry by id';
  end if;
end;
$$;

-- A must not modify B's rows: the UPDATE policy's USING clause hides them.
do $$
declare
  changed integer;
begin
  update public.business_playbook_actions set status = 'completed'
   where id = 'b0000000-0000-4000-8000-0000000000a2';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'BC_RLS_FAILED: A modified B action (% rows)', changed; end if;

  update public.business_finance_entries set amount_cents = 1
   where id = 'b0000000-0000-4000-8000-0000000000b2';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'BC_RLS_FAILED: A modified B finance entry (% rows)', changed; end if;
end;
$$;

-- A must not attach anything to B's profile, nor insert as B.
do $$
begin
  begin
    insert into public.business_diagnoses (owner_id, profile_id, model, prompt_version)
    values ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-0000000000f2',
            'openai/gpt-oss-20b', 'horizon-business-diagnosis-v1');
    raise exception 'BC_RLS_FAILED: A attached a diagnosis to B profile';
  exception
    when foreign_key_violation then null;   -- expected: composite FK refuses it
    when insufficient_privilege then null;  -- expected: WITH CHECK refuses it
  end;

  begin
    insert into public.business_finance_entries (owner_id, profile_id, kind, category, amount_cents, period_month, source, evidence_class)
    values ('b0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-0000000000f2',
            'expense', 'expense_other', 100, '2026-02-01', 'manual', 'user_provided');
    raise exception 'BC_RLS_FAILED: A inserted a finance entry as B';
  exception
    when insufficient_privilege then null;  -- expected: WITH CHECK refuses it
  end;

  -- A must not link B's uploaded document into A's own workspace.
  begin
    insert into public.business_documents (owner_id, profile_id, document_id, category)
    values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-0000000000f1',
            'b0000000-0000-4000-8000-0000000000e2', 'invoice');
    raise exception 'BC_RLS_FAILED: A linked B document';
  exception
    when foreign_key_violation then null;   -- expected: composite FK refuses it
    when insufficient_privilege then null;  -- expected: WITH CHECK refuses it
  end;
end;
$$;

-- A regenerated plan updates the same action row instead of duplicating it.
do $$
begin
  begin
    insert into public.business_playbook_actions (owner_id, profile_id, horizon, action_key, title)
    values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-0000000000f1',
            30, 'tidy-books', 'Doppelt');
    raise exception 'BC_RLS_FAILED: duplicate (profile, horizon, action_key) accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- At most one live diagnosis per profile.
do $$
begin
  begin
    insert into public.business_diagnoses (owner_id, profile_id, model, prompt_version)
    values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-0000000000f1',
            'openai/gpt-oss-20b', 'horizon-business-diagnosis-v1');
    raise exception 'BC_RLS_FAILED: a second live diagnosis was accepted';
  exception
    when unique_violation then null; -- expected
  end;
end;
$$;

-- An invalid category / evidence class is rejected by the CHECK constraints.
do $$
begin
  begin
    insert into public.business_finance_entries (owner_id, profile_id, kind, category, amount_cents, period_month, source, evidence_class)
    values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-0000000000f1',
            'revenue', 'not_a_category', 100, '2026-03-01', 'manual', 'user_provided');
    raise exception 'BC_RLS_FAILED: invalid category accepted';
  exception
    when check_violation then null; -- expected
  end;

  begin
    insert into public.business_finance_entries (owner_id, profile_id, kind, category, amount_cents, period_month, source, evidence_class)
    values ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-0000000000f1',
            'revenue', 'revenue_sales', 100, '2026-03-01', 'guessed', 'verified_fact');
    raise exception 'BC_RLS_FAILED: invalid source accepted';
  exception
    when check_violation then null; -- expected
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anonymous access must be denied outright.
-- ---------------------------------------------------------------------------
reset role;
set local role anon;

do $$
begin
  begin
    perform 1 from public.business_diagnoses limit 1;
    raise exception 'BC_RLS_FAILED: anon read business_diagnoses';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.business_playbook_actions limit 1;
    raise exception 'BC_RLS_FAILED: anon read business_playbook_actions';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.business_documents limit 1;
    raise exception 'BC_RLS_FAILED: anon read business_documents';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.business_finance_entries limit 1;
    raise exception 'BC_RLS_FAILED: anon read business_finance_entries';
  exception when insufficient_privilege then null; end;
end;
$$;

rollback;

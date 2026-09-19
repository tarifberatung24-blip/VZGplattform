-- HORIZON P5 canonical case engine: ownership isolation.
--
-- Run only against a disposable local/staging database after applying the
-- canonical spine migration:
--   1. supabase/migrations/20260909112037_kintex_assistant_baseline.sql
--   2. supabase/migrations/20260919150000_horizon_case_engine.sql
-- The transaction always rolls back its synthetic fixtures.
--
-- Covers the canonical owner-scoped `public.cases` spine only. The `platform_*`
-- family is a preserved compatibility surface and is not exercised here.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'a0000000-0000-4000-8000-00000000000a',
    'horizon-rls-a@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'b0000000-0000-4000-8000-00000000000b',
    'horizon-rls-b@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

-- Fixtures are inserted as the table owner so RLS is not a factor here; the
-- assertions below run as `authenticated`.
insert into public.cases (id, owner_id, title, intent, horizon_status, horizon_module)
values
  (
    'a0000000-0000-4000-8000-0000000000c1',
    'a0000000-0000-4000-8000-00000000000a',
    'Case A', 'reply', 'collecting_data', 'kuendigung'
  ),
  (
    'b0000000-0000-4000-8000-0000000000c2',
    'b0000000-0000-4000-8000-00000000000b',
    'Case B', 'reply', 'collecting_data', 'kuendigung'
  );

insert into public.source_documents (id, owner_id, case_id, path, mime, size_bytes, sha256)
values
  (
    'a0000000-0000-4000-8000-0000000000d1',
    'a0000000-0000-4000-8000-00000000000a',
    'a0000000-0000-4000-8000-0000000000c1',
    'a0000000-0000-4000-8000-00000000000a/a0000000-0000-4000-8000-0000000000c1/a.pdf',
    'application/pdf', 8, repeat('a', 64)
  ),
  (
    'b0000000-0000-4000-8000-0000000000d2',
    'b0000000-0000-4000-8000-00000000000b',
    'b0000000-0000-4000-8000-0000000000c2',
    'b0000000-0000-4000-8000-00000000000b/b0000000-0000-4000-8000-0000000000c2/b.pdf',
    'application/pdf', 8, repeat('b', 64)
  );

insert into public.extracted_facts (id, owner_id, case_id, document_id, page_no, key, value, evidence, source_type, critical)
values
  (
    'a0000000-0000-4000-8000-0000000000f1',
    'a0000000-0000-4000-8000-00000000000a',
    'a0000000-0000-4000-8000-0000000000c1',
    'a0000000-0000-4000-8000-0000000000d1', 1,
    'contract_provider', 'Provider A', 'Seite 1', 'document', true
  ),
  (
    'b0000000-0000-4000-8000-0000000000f2',
    'b0000000-0000-4000-8000-00000000000b',
    'b0000000-0000-4000-8000-0000000000c2',
    'b0000000-0000-4000-8000-0000000000d2', 1,
    'contract_provider', 'Provider B', 'Seite 1', 'document', true
  );

insert into public.case_messages (id, owner_id, case_id, role, locale, content)
values
  ('a0000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1', 'user', 'bg', 'A message'),
  ('b0000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2', 'user', 'bg', 'B message');

insert into public.correspondence_drafts (
  id, owner_id, case_id, version, subject_de, body_de, model, prompt_version,
  input_facts_hash, content_hash
)
values
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1', 1, 'Betreff A', 'Text A', 'test', 'v1',
   repeat('a', 64), repeat('1', 64)),
  ('b0000000-0000-4000-8000-0000000000b2', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2', 1, 'Betreff B', 'Text B', 'test', 'v1',
   repeat('b', 64), repeat('2', 64));

insert into public.approvals (id, user_id, draft_id, approved_hash)
values
  ('a0000000-0000-4000-8000-000000000091', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000a1', repeat('1', 64)),
  ('b0000000-0000-4000-8000-000000000092', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000b2', repeat('2', 64));

insert into public.tasks (id, owner_id, case_id, type, status)
values
  ('a0000000-0000-4000-8000-000000000071', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1', 'reminder', 'pending'),
  ('b0000000-0000-4000-8000-000000000072', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2', 'reminder', 'pending');

insert into public.audit_events (id, actor_id, case_id, action)
values
  ('a0000000-0000-4000-8000-000000000061', 'a0000000-0000-4000-8000-00000000000a',
   'a0000000-0000-4000-8000-0000000000c1', 'case_created'),
  ('b0000000-0000-4000-8000-000000000062', 'b0000000-0000-4000-8000-00000000000b',
   'b0000000-0000-4000-8000-0000000000c2', 'case_created');

-- ---------------------------------------------------------------------------
-- Customer A must see exactly their own row in every canonical table.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from public.cases;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % cases, expected 1', n; end if;

  select count(*) into n from public.source_documents;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % documents, expected 1', n; end if;

  select count(*) into n from public.document_pages;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: A sees % pages, expected 0', n; end if;

  select count(*) into n from public.extracted_facts;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % facts, expected 1', n; end if;

  select count(*) into n from public.case_messages;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % messages, expected 1', n; end if;

  select count(*) into n from public.correspondence_drafts;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % drafts, expected 1', n; end if;

  select count(*) into n from public.approvals;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % approvals, expected 1', n; end if;

  select count(*) into n from public.tasks;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % tasks, expected 1', n; end if;

  select count(*) into n from public.audit_events;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: A sees % audit events, expected 1', n; end if;
end;
$$;

-- A must not be able to read B's row by primary key, even when asking directly.
do $$
begin
  if exists (select 1 from public.cases where id = 'b0000000-0000-4000-8000-0000000000c2') then
    raise exception 'RLS_TEST_FAILED: A read B case by id';
  end if;
  if exists (select 1 from public.source_documents where id = 'b0000000-0000-4000-8000-0000000000d2') then
    raise exception 'RLS_TEST_FAILED: A read B document by id';
  end if;
  if exists (select 1 from public.extracted_facts where id = 'b0000000-0000-4000-8000-0000000000f2') then
    raise exception 'RLS_TEST_FAILED: A read B fact by id';
  end if;
  if exists (select 1 from public.case_messages where id = 'b0000000-0000-4000-8000-0000000000e2') then
    raise exception 'RLS_TEST_FAILED: A read B message by id';
  end if;
  if exists (select 1 from public.correspondence_drafts where id = 'b0000000-0000-4000-8000-0000000000b2') then
    raise exception 'RLS_TEST_FAILED: A read B draft by id';
  end if;
  if exists (select 1 from public.approvals where id = 'b0000000-0000-4000-8000-000000000092') then
    raise exception 'RLS_TEST_FAILED: A read B approval by id';
  end if;
  if exists (select 1 from public.tasks where id = 'b0000000-0000-4000-8000-000000000072') then
    raise exception 'RLS_TEST_FAILED: A read B task by id';
  end if;
  if exists (select 1 from public.audit_events where id = 'b0000000-0000-4000-8000-000000000062') then
    raise exception 'RLS_TEST_FAILED: A read B audit event by id';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- A must not be able to write into B's case, nor reassign ownership to B.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Child rows cannot be attached to B's case.
  begin
    insert into public.case_messages (owner_id, case_id, role, locale, content)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 'user', 'bg', 'forbidden');
    raise exception 'RLS_TEST_FAILED: A inserted a message into B case';
  exception when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.extracted_facts (owner_id, case_id, key, value, source_type)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 'k', 'v', 'user');
    raise exception 'RLS_TEST_FAILED: A inserted a fact into B case';
  exception when insufficient_privilege or check_violation or foreign_key_violation then null;
  end;

  begin
    insert into public.correspondence_drafts (
      owner_id, case_id, version, subject_de, body_de, model, prompt_version,
      input_facts_hash, content_hash
    )
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 9, 's', 'b', 'test', 'v1',
            repeat('c', 64), repeat('d', 64));
    raise exception 'RLS_TEST_FAILED: A inserted a draft into B case';
  exception when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.tasks (owner_id, case_id, type)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 'reminder');
    raise exception 'RLS_TEST_FAILED: A inserted a task into B case';
  exception when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.audit_events (actor_id, case_id, action)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000c2', 'forged');
    raise exception 'RLS_TEST_FAILED: A forged an audit event on B case';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- A cannot create a case owned by B.
  begin
    insert into public.cases (owner_id, title, intent)
    values ('b0000000-0000-4000-8000-00000000000b', 'forged', 'reply');
    raise exception 'RLS_TEST_FAILED: A created a case owned by B';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- A cannot hand their own case to B.
  begin
    update public.cases
    set owner_id = 'b0000000-0000-4000-8000-00000000000b'
    where id = 'a0000000-0000-4000-8000-0000000000c1';
    raise exception 'RLS_TEST_FAILED: A reassigned ownership of their case';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- A cannot modify or read-delete B's case.
  begin
    update public.cases set title = 'hijacked'
    where id = 'b0000000-0000-4000-8000-0000000000c2';
    if found then raise exception 'RLS_TEST_FAILED: A updated B case'; end if;
  exception when insufficient_privilege then null;
  end;

  -- A cannot approve B's draft.
  begin
    insert into public.approvals (user_id, draft_id, approved_hash)
    values ('a0000000-0000-4000-8000-00000000000a',
            'b0000000-0000-4000-8000-0000000000b2', repeat('2', 64));
    raise exception 'RLS_TEST_FAILED: A approved B draft';
  exception when insufficient_privilege or foreign_key_violation or check_violation then null;
  end;

  -- A cannot confirm B's fact.
  begin
    update public.extracted_facts set confirmed_at = now()
    where id = 'b0000000-0000-4000-8000-0000000000f2';
    if found then raise exception 'RLS_TEST_FAILED: A confirmed B fact'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- A's own legitimate writes must succeed, so the grants are not simply closed.
-- ---------------------------------------------------------------------------
insert into public.cases (owner_id, title, intent, horizon_status, horizon_module)
values ('a0000000-0000-4000-8000-00000000000a', 'Own new case', 'reply',
        'draft', 'jobcenter');

update public.cases set horizon_status = 'processing', status = 'DRAFTING'
where id = 'a0000000-0000-4000-8000-0000000000c1';

insert into public.case_messages (owner_id, case_id, role, locale, content)
values ('a0000000-0000-4000-8000-00000000000a',
        'a0000000-0000-4000-8000-0000000000c1', 'user', 'bg', 'own message');

-- FOUND is only valid inside PL/pgSQL, so the positive control is wrapped.
do $$
begin
  update public.extracted_facts set confirmed_at = now()
  where id = 'a0000000-0000-4000-8000-0000000000f1';
  if not found then
    raise exception 'RLS_TEST_FAILED: A could not confirm own fact';
  end if;
end;
$$;

insert into public.audit_events (actor_id, case_id, action)
values ('a0000000-0000-4000-8000-00000000000a',
        'a0000000-0000-4000-8000-0000000000c1', 'own_action');

do $$
declare
  n integer;
begin
  select count(*) into n from public.audit_events
  where id = 'a0000000-0000-4000-8000-000000000061';
  if n <> 1 then
    raise exception 'RLS_TEST_FAILED: audit_events SELECT not permitted for own row';
  end if;

  select count(*) into n from public.cases;
  if n <> 2 then raise exception 'RLS_TEST_FAILED: A sees % cases after own write, expected 2', n; end if;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Anonymous clients must have no access to the canonical spine.
-- ---------------------------------------------------------------------------
set local role anon;
do $$
declare
  blocked boolean := false;
begin
  begin
    perform count(*) from public.cases;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then
    raise exception 'RLS_TEST_FAILED: anon could read public.cases';
  end if;

  blocked := false;
  begin
    perform count(*) from public.extracted_facts;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then
    raise exception 'RLS_TEST_FAILED: anon could read public.extracted_facts';
  end if;

  blocked := false;
  begin
    perform count(*) from public.audit_events;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then
    raise exception 'RLS_TEST_FAILED: anon could read public.audit_events';
  end if;
end;
$$;
reset role;

rollback;
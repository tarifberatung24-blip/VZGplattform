-- Run only against a disposable local/staging database after applying:
--   1. supabase/baseline/kintexbg_b2c_v1.sql
--   2. supabase/prepared/kintex_b2c_rls_hardening.sql
-- The transaction always rolls back its synthetic fixtures.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'kintex-rls-a@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'kintex-rls-b@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.households (id, owner_id, name)
values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'RLS A'),
  ('20000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000002', 'RLS B');

insert into public.documents (
  id, household_id, original_filename, storage_path, mime_type, size_bytes
)
values
  (
    '10000000-0000-4000-8000-000000000111',
    '10000000-0000-4000-8000-000000000011',
    'a.pdf',
    'households/10000000-0000-4000-8000-000000000011/documents/10000000-0000-4000-8000-000000000111/a.pdf',
    'application/pdf', 8
  ),
  (
    '20000000-0000-4000-8000-000000000222',
    '20000000-0000-4000-8000-000000000022',
    'b.pdf',
    'households/20000000-0000-4000-8000-000000000022/documents/20000000-0000-4000-8000-000000000222/b.pdf',
    'application/pdf', 8
  );

insert into public.contracts (
  id, household_id, category, title, provider_name
)
values
  (
    '10000000-0000-4000-8000-000000001111',
    '10000000-0000-4000-8000-000000000011',
    'electricity', 'Contract A', 'Provider A'
  ),
  (
    '20000000-0000-4000-8000-000000002222',
    '20000000-0000-4000-8000-000000000022',
    'gas', 'Contract B', 'Provider B'
  );

-- Authenticate as customer A.
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  if (select count(*) from public.households) <> 1 then
    raise exception 'RLS_TEST_FAILED: customer A must see exactly one household';
  end if;
  if (select count(*) from public.documents) <> 1 then
    raise exception 'RLS_TEST_FAILED: customer A must see exactly one document';
  end if;
  if (select count(*) from public.contracts) <> 1 then
    raise exception 'RLS_TEST_FAILED: customer A must see exactly one contract';
  end if;
end;
$$;

insert into public.document_analysis_results (document_id, user_id, result)
values (
  '10000000-0000-4000-8000-000000000111',
  '10000000-0000-4000-8000-000000000001',
  '{"fixture":true}'::jsonb
);

insert into public.document_reviews (document_id, user_id, facts)
values (
  '10000000-0000-4000-8000-000000000111',
  '10000000-0000-4000-8000-000000000001',
  '{"fixture":true}'::jsonb
);

-- A caller-controlled user_id must not authorize access to B's document.
do $$
begin
  begin
    insert into public.document_analysis_results (document_id, user_id, result)
    values (
      '20000000-0000-4000-8000-000000000222',
      '10000000-0000-4000-8000-000000000001',
      '{"forbidden":true}'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: cross-household analysis insert was allowed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.document_reviews (document_id, user_id, facts)
    values (
      '20000000-0000-4000-8000-000000000222',
      '10000000-0000-4000-8000-000000000001',
      '{"forbidden":true}'::jsonb
    );
    raise exception 'RLS_TEST_FAILED: cross-household review insert was allowed';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Cross-household foreign-key links must be rejected even when the new row
-- itself is assigned to customer A's household.
do $$
begin
  begin
    insert into public.cases (household_id, contract_id, title)
    values (
      '10000000-0000-4000-8000-000000000011',
      '20000000-0000-4000-8000-000000002222',
      'Forbidden cross-tenant case'
    );
    raise exception 'RLS_TEST_FAILED: cross-household contract link was allowed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.documents
    set contract_id = '20000000-0000-4000-8000-000000002222'
    where id = '10000000-0000-4000-8000-000000000111';
    raise exception 'RLS_TEST_FAILED: cross-household document link was allowed';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Only the canonical Storage path is accepted.
insert into storage.objects (bucket_id, name)
values (
  'documents',
  'households/10000000-0000-4000-8000-000000000011/documents/10000000-0000-4000-8000-000000000111/test.pdf'
);

do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      '10000000-0000-4000-8000-000000000011/legacy-path.pdf'
    );
    raise exception 'RLS_TEST_FAILED: obsolete Storage path was allowed';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      'households/20000000-0000-4000-8000-000000000022/documents/20000000-0000-4000-8000-000000000222/foreign.pdf'
    );
    raise exception 'RLS_TEST_FAILED: foreign Storage path was allowed';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- Anonymous clients must not receive table privileges for private B2C data.
set local role anon;
do $$
begin
  begin
    perform count(*) from public.documents;
    raise exception 'RLS_TEST_FAILED: anon retained document table access';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

rollback;

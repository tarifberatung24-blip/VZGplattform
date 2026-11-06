-- HORIZON Service Request → Case: atomic idempotency for provisioning artifacts.
--
-- Run only against a disposable local/staging database after applying:
--   supabase/migrations/20260909112037_kintex_assistant_baseline.sql
--   supabase/migrations/20260919150000_horizon_case_engine.sql
--   supabase/migrations/20260920090100_horizon_case_engine_rls_policies.sql
--   supabase/migrations/20261105120000_service_request_id_idempotency.sql
--   supabase/migrations/20261106160000_service_request_artifact_idempotency.sql
-- The transaction always rolls back its synthetic fixtures.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  'e0000000-0000-4000-8000-00000000000e',
  'hz-artifact-idem-e@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.cases (
  id, owner_id, title, intent, ui_locale, conversation_locale,
  horizon_status, horizon_module, service_request_id
)
values (
  'e1000000-0000-4000-8000-00000000000e',
  'e0000000-0000-4000-8000-00000000000e',
  'artifact idempotency fixture',
  'application', 'bg', 'bg', 'draft', 'general', 'hz_artifact_request'
);

-- The unique indexes make each artifact insert atomic. They are scoped to the
-- owner and key, not to the business fact key (which must remain append-only).
do $$
begin
  insert into public.extracted_facts (
    owner_id, case_id, key, value, source_type, critical, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'service_request_id', 'hz_artifact_request', 'user', true,
    'horizon-service-request:hz_artifact_request:fact:service_request_id'
  );

  begin
    insert into public.extracted_facts (
      owner_id, case_id, key, value, source_type, critical, idempotency_key
    ) values (
      'e0000000-0000-4000-8000-00000000000e',
      'e1000000-0000-4000-8000-00000000000e',
      'service_request_id', 'hz_artifact_request', 'user', true,
      'horizon-service-request:hz_artifact_request:fact:service_request_id'
    );
    raise exception 'ARTIFACT_IDEMPOTENCY_TEST_FAILED: duplicate fact artifact was accepted';
  exception when unique_violation then null;
  end;

  insert into public.case_messages (
    owner_id, case_id, role, locale, content, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'assistant', 'bg', 'Provisioning opening message',
    'horizon-service-request:hz_artifact_request:message:opening'
  );

  begin
    insert into public.case_messages (
      owner_id, case_id, role, locale, content, idempotency_key
    ) values (
      'e0000000-0000-4000-8000-00000000000e',
      'e1000000-0000-4000-8000-00000000000e',
      'assistant', 'bg', 'Duplicate opening message',
      'horizon-service-request:hz_artifact_request:message:opening'
    );
    raise exception 'ARTIFACT_IDEMPOTENCY_TEST_FAILED: duplicate message artifact was accepted';
  exception when unique_violation then null;
  end;

  insert into public.audit_events (
    actor_id, case_id, action, metadata, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'alpha_team_run_created', '{}'::jsonb,
    'horizon-service-request:hz_artifact_request:audit:alpha_team_run_created'
  );

  begin
    insert into public.audit_events (
      actor_id, case_id, action, metadata, idempotency_key
    ) values (
      'e0000000-0000-4000-8000-00000000000e',
      'e1000000-0000-4000-8000-00000000000e',
      'alpha_team_run_created', '{}'::jsonb,
      'horizon-service-request:hz_artifact_request:audit:alpha_team_run_created'
    );
    raise exception 'ARTIFACT_IDEMPOTENCY_TEST_FAILED: duplicate audit artifact was accepted';
  exception when unique_violation then null;
  end;

  -- Idempotency keys are scoped to their owner; a second owner may use the same
  -- key without colliding with the first owner's artifacts.
  insert into auth.users (
    id, email, aud, role, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    'e0000000-0000-4000-8000-00000000000f',
    'hz-artifact-idem-f@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

  insert into public.cases (
    id, owner_id, title, intent, ui_locale, conversation_locale,
    horizon_status, horizon_module, service_request_id
  )
  values (
    'e1000000-0000-4000-8000-00000000000f',
    'e0000000-0000-4000-8000-00000000000f',
    'second owner fixture',
    'application', 'bg', 'bg', 'draft', 'general', 'hz_artifact_request_other_owner'
  );

  insert into public.extracted_facts (
    owner_id, case_id, key, value, source_type, critical, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000f',
    'e1000000-0000-4000-8000-00000000000f',
    'service_request_id', 'same-key-is-owner-scoped', 'user', true,
    'horizon-service-request:hz_artifact_request:fact:service_request_id'
  );
end $$;

-- The authenticated session must be able to set the newly granted column for
-- all three canonical child tables; existing RLS policies still scope ownership.
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-00000000000e', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"e0000000-0000-4000-8000-00000000000e","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  insert into public.extracted_facts (
    owner_id, case_id, key, value, source_type, critical, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'intake_name', 'test', 'user', false,
    'horizon-service-request:hz_artifact_request:fact:intake_name'
  );
  insert into public.case_messages (
    owner_id, case_id, role, locale, content, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'assistant', 'bg', 'authenticated grant test',
    'horizon-service-request:hz_artifact_request:message:authenticated-test'
  );
  insert into public.audit_events (
    actor_id, case_id, action, metadata, idempotency_key
  ) values (
    'e0000000-0000-4000-8000-00000000000e',
    'e1000000-0000-4000-8000-00000000000e',
    'authenticated_artifact_test', '{}'::jsonb,
    'horizon-service-request:hz_artifact_request:audit:authenticated-test'
  );
exception when insufficient_privilege then
  raise exception 'ARTIFACT_IDEMPOTENCY_TEST_FAILED: authenticated lacks an idempotency_key insert grant';
end $$;

reset role;
rollback;

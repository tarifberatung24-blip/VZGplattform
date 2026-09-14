-- Backfill the migration version used by the Supabase Preview integration.
-- Every operation is guarded so it is safe on the Frankfurt schema as well.

do $$
declare
  target text;
  targets text[] := array[
    'benefit_cases','contract_reviews','contracts','deadlines','documents',
    'family_members','finanzamt_requests','households','opportunity_checks',
    'provider_submission_attempts','provider_submission_events','reminders',
    'tax_cases','tax_form_registry'
  ];
  columns text[] := array[
    'user_id','user_id','user_id','user_id','user_id','household_id',
    'linked_tax_return_id','user_id','user_id','provider_id','user_id',
    'attempt_id','user_id','user_id','source_id'
  ];
  names text[] := array[
    'benefit_cases_user_id_idx','contract_reviews_user_id_idx','contracts_user_id_idx',
    'deadlines_user_id_idx','documents_user_id_idx','family_members_household_id_idx',
    'finanzamt_requests_linked_tax_return_id_idx','finanzamt_requests_user_id_idx',
    'opportunity_checks_user_id_idx','provider_submission_attempts_provider_id_idx',
    'provider_submission_attempts_user_id_idx','provider_submission_events_attempt_id_idx',
    'reminders_user_id_idx','tax_cases_user_id_idx','tax_form_registry_source_id_idx'
  ];
  i integer;
begin
  for i in 1..array_length(targets, 1) loop
    if to_regclass('public.' || targets[i]) is not null then
      execute format('create index if not exists %I on public.%I (%I)', names[i], targets[i], columns[i]);
    end if;
  end loop;

  if to_regprocedure('public.prevent_provider_event_mutation()') is not null then
    alter function public.prevent_provider_event_mutation() set search_path = pg_catalog, public;
  end if;

  if to_regprocedure('public.handle_new_user()') is not null then
    revoke execute on function public.handle_new_user() from public, anon, authenticated;
  end if;
end $$;

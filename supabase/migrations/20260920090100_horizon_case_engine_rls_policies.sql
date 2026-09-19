-- HORIZON reconciliation: canonical write RLS policies.
--
-- Production finding: the earlier P5 migration added child-table column grants
-- but not the matching write policies, so the session client held insert/update
-- privileges that no policy permitted. A grant without a permissive policy still
-- denies the write, which is why the engine could not persist cases, documents,
-- facts, messages, drafts, approvals, tasks, or audit events.
--
-- This migration adds the missing owner-scoped policies. Every policy is created
-- only when absent, scoped `to authenticated`, and keyed on `auth.uid()`. No
-- policy is dropped, replaced, or widened; no `using (true)` and no anon access.

-- cases: the earlier migration granted insert/update on the new markers, but the
-- engine also writes institution and deadline, so those are added to the same
-- column-scoped grants.
grant insert (institution, deadline, horizon_status, horizon_module)
  on public.cases to authenticated;
grant update (
  horizon_status, horizon_module, status, institution, deadline
) on public.cases to authenticated;

-- The engine updates source_documents.status after upload/extraction.
grant update (status) on public.source_documents to authenticated;

-- INSERT policies: owner column differs per table (owner_id / user_id / actor_id).
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('source_documents',      'source_documents_insert_own',      'owner_id'),
      ('extracted_facts',       'extracted_facts_insert_own',       'owner_id'),
      ('case_messages',         'case_messages_insert_own',         'owner_id'),
      ('correspondence_drafts', 'correspondence_drafts_insert_own', 'owner_id'),
      ('approvals',             'approvals_insert_own',             'user_id'),
      ('tasks',                 'tasks_insert_own',                 'owner_id'),
      ('audit_events',          'audit_events_insert_own',          'actor_id')
    ) as t(table_name, policy_name, owner_column)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)',
        target.policy_name, target.table_name, target.owner_column
      );
    end if;
  end loop;
end;
$$;

-- UPDATE policies need both clauses: USING restricts which existing rows may be
-- targeted, WITH CHECK restricts what the updated row may become. Omitting USING
-- would let a caller target another user's row and rely on the grant alone.
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('source_documents',      'source_documents_update_own',      'owner_id'),
      ('extracted_facts',       'extracted_facts_update_own',       'owner_id'),
      ('correspondence_drafts', 'correspondence_drafts_update_own', 'owner_id'),
      ('tasks',                 'tasks_update_own',                 'owner_id')
    ) as t(table_name, policy_name, owner_column)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = target.table_name
        and policyname = target.policy_name
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
        target.policy_name, target.table_name, target.owner_column, target.owner_column
      );
    end if;
  end loop;
end;
$$;

-- EXPLICITLY NOT DONE: no delete policy is added for any child table. Deleting a
-- case cascades to its children through the existing foreign keys, so no direct
-- client delete path is required.
-- KintexBG B2C tenant-isolation hardening.
-- PREPARED ONLY: do not apply directly to production.
-- First validate on a fresh/staging Supabase project with the baseline and
-- supabase/tests/rls/kintex_b2c_isolation.sql.

-- Remove the obsolete storage layout policies. The application uses
-- households/{household_id}/documents/{document_id}/{filename} exclusively.
drop policy if exists "documents_storage_select_own" on storage.objects;
drop policy if exists "documents_storage_insert_own" on storage.objects;
drop policy if exists "documents_storage_update_own" on storage.objects;
drop policy if exists "documents_storage_delete_own" on storage.objects;

-- Public Data API access is not needed for private customer data.
revoke all on table
  public.profiles,
  public.households,
  public.providers,
  public.contracts,
  public.cases,
  public.documents,
  public.tasks,
  public.correspondence_drafts,
  public.approvals,
  public.audit_events,
  public.kindergeld_cases,
  public.radar_events,
  public.document_analysis_results,
  public.document_reviews,
  public.contract_radar_history
from anon;

-- Remove default broad privileges, then grant only operations backed by policy.
revoke all on table
  public.profiles,
  public.households,
  public.providers,
  public.contracts,
  public.cases,
  public.documents,
  public.tasks,
  public.correspondence_drafts,
  public.approvals,
  public.audit_events,
  public.kindergeld_cases,
  public.radar_events,
  public.document_analysis_results,
  public.document_reviews,
  public.contract_radar_history
from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.households to authenticated;
grant select on table public.providers to authenticated;
grant select, insert, update, delete on table
  public.contracts,
  public.cases,
  public.documents,
  public.tasks,
  public.correspondence_drafts,
  public.kindergeld_cases,
  public.radar_events,
  public.document_analysis_results,
  public.document_reviews,
  public.contract_radar_history
to authenticated;
grant select, insert on table public.approvals, public.audit_events to authenticated;

-- Direct ownership policies. Wrapping auth.uid() in SELECT avoids per-row calls.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "households_select_own" on public.households;
create policy "households_select_own" on public.households
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "households_insert_own" on public.households;
create policy "households_insert_own" on public.households
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "households_update_own" on public.households;
create policy "households_update_own" on public.households
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "households_delete_own" on public.households;
create policy "households_delete_own" on public.households
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Contract references must remain inside the same owned household.
drop policy if exists "contracts_insert_own_household" on public.contracts;
create policy "contracts_insert_own_household" on public.contracts
  for insert to authenticated
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      document_id is null or document_id in (
        select id from public.documents where household_id = contracts.household_id
      )
    )
    and (
      source_document_id is null or source_document_id in (
        select id from public.documents where household_id = contracts.household_id
      )
    )
  );
drop policy if exists "contracts_update_own_household" on public.contracts;
create policy "contracts_update_own_household" on public.contracts
  for update to authenticated
  using (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
  )
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      document_id is null or document_id in (
        select id from public.documents where household_id = contracts.household_id
      )
    )
    and (
      source_document_id is null or source_document_id in (
        select id from public.documents where household_id = contracts.household_id
      )
    )
  );

-- Case references cannot point to another household's contract.
drop policy if exists "cases_select_own_household" on public.cases;
create policy "cases_select_own_household" on public.cases
  for select to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));
drop policy if exists "cases_insert_own_household" on public.cases;
create policy "cases_insert_own_household" on public.cases
  for insert to authenticated
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      contract_id is null or contract_id in (
        select id from public.contracts where household_id = cases.household_id
      )
    )
  );
drop policy if exists "cases_update_own_household" on public.cases;
create policy "cases_update_own_household" on public.cases
  for update to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ))
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      contract_id is null or contract_id in (
        select id from public.contracts where household_id = cases.household_id
      )
    )
  );
drop policy if exists "cases_delete_own_household" on public.cases;
create policy "cases_delete_own_household" on public.cases
  for delete to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));

-- Documents may only link to contracts and cases in their own household.
drop policy if exists "documents_insert_own_household" on public.documents;
create policy "documents_insert_own_household" on public.documents
  for insert to authenticated
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      contract_id is null or contract_id in (
        select id from public.contracts where household_id = documents.household_id
      )
    )
    and (
      case_id is null or case_id in (
        select id from public.cases where household_id = documents.household_id
      )
    )
  );
drop policy if exists "documents_update_own_household" on public.documents;
create policy "documents_update_own_household" on public.documents
  for update to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ))
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (
      contract_id is null or contract_id in (
        select id from public.contracts where household_id = documents.household_id
      )
    )
    and (
      case_id is null or case_id in (
        select id from public.cases where household_id = documents.household_id
      )
    )
  );

-- Tasks, correspondence and approvals must preserve household consistency.
drop policy if exists "tasks_select_own_household" on public.tasks;
create policy "tasks_select_own_household" on public.tasks
  for select to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));
drop policy if exists "tasks_insert_own_household" on public.tasks;
create policy "tasks_insert_own_household" on public.tasks
  for insert to authenticated with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (case_id is null or case_id in (
      select id from public.cases where household_id = tasks.household_id
    ))
    and (contract_id is null or contract_id in (
      select id from public.contracts where household_id = tasks.household_id
    ))
  );
drop policy if exists "tasks_update_own_household" on public.tasks;
create policy "tasks_update_own_household" on public.tasks
  for update to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ))
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and (case_id is null or case_id in (
      select id from public.cases where household_id = tasks.household_id
    ))
    and (contract_id is null or contract_id in (
      select id from public.contracts where household_id = tasks.household_id
    ))
  );
drop policy if exists "tasks_delete_own_household" on public.tasks;
create policy "tasks_delete_own_household" on public.tasks
  for delete to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));

drop policy if exists "correspondence_drafts_select_own_household" on public.correspondence_drafts;
create policy "correspondence_drafts_select_own_household" on public.correspondence_drafts
  for select to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));
drop policy if exists "correspondence_drafts_insert_own_household" on public.correspondence_drafts;
create policy "correspondence_drafts_insert_own_household" on public.correspondence_drafts
  for insert to authenticated with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and case_id in (
      select id from public.cases where household_id = correspondence_drafts.household_id
    )
  );
drop policy if exists "correspondence_drafts_update_own_household" on public.correspondence_drafts;
create policy "correspondence_drafts_update_own_household" on public.correspondence_drafts
  for update to authenticated
  using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ))
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and case_id in (
      select id from public.cases where household_id = correspondence_drafts.household_id
    )
  );
drop policy if exists "correspondence_drafts_delete_own_household" on public.correspondence_drafts;
create policy "correspondence_drafts_delete_own_household" on public.correspondence_drafts
  for delete to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));

drop policy if exists "approvals_select_own_household" on public.approvals;
create policy "approvals_select_own_household" on public.approvals
  for select to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));
drop policy if exists "approvals_insert_own_household" on public.approvals;
create policy "approvals_insert_own_household" on public.approvals
  for insert to authenticated with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and case_id in (
      select id from public.cases where household_id = approvals.household_id
    )
    and (draft_id is null or draft_id in (
      select id from public.correspondence_drafts
      where household_id = approvals.household_id
    ))
  );

-- Audit rows remain append-only for clients.
drop policy if exists "audit_events_select_own_household" on public.audit_events;
create policy "audit_events_select_own_household" on public.audit_events
  for select to authenticated using (household_id in (
    select id from public.households where owner_id = (select auth.uid())
  ));
drop policy if exists "audit_events_insert_own_household" on public.audit_events;
create policy "audit_events_insert_own_household" on public.audit_events
  for insert to authenticated with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and actor_user_id = (select auth.uid())
  );

-- AI-derived data must belong both to the caller and to a document owned by
-- the caller. A caller-supplied user_id alone is not sufficient authorization.
drop policy if exists "kintex_analysis_owner_all" on public.document_analysis_results;
create policy "kintex_analysis_owner_all" on public.document_analysis_results
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.documents d
      join public.households h on h.id = d.household_id
      where d.id = document_analysis_results.document_id
        and h.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.documents d
      join public.households h on h.id = d.household_id
      where d.id = document_analysis_results.document_id
        and h.owner_id = (select auth.uid())
    )
  );

drop policy if exists "kintex_reviews_owner_all" on public.document_reviews;
create policy "kintex_reviews_owner_all" on public.document_reviews
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.documents d
      join public.households h on h.id = d.household_id
      where d.id = document_reviews.document_id
        and h.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.documents d
      join public.households h on h.id = d.household_id
      where d.id = document_reviews.document_id
        and h.owner_id = (select auth.uid())
    )
  );

drop policy if exists "contract_radar_history_owner_all" on public.contract_radar_history;
create policy "contract_radar_history_owner_all" on public.contract_radar_history
  for all to authenticated
  using (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
  )
  with check (
    household_id in (
      select id from public.households where owner_id = (select auth.uid())
    )
    and contract_id in (
      select id from public.contracts
      where household_id = contract_radar_history.household_id
    )
  );

-- Index every uncovered foreign-key side reported by the production advisor.
create index if not exists approvals_draft_id_idx on public.approvals(draft_id);
create index if not exists audit_events_actor_user_id_idx on public.audit_events(actor_user_id);
create index if not exists cases_contract_id_idx on public.cases(contract_id);
create index if not exists contracts_provider_id_idx on public.contracts(provider_id);
create index if not exists document_analysis_results_document_id_idx
  on public.document_analysis_results(document_id);
create index if not exists document_analysis_results_user_id_idx
  on public.document_analysis_results(user_id);
create index if not exists document_reviews_user_id_idx on public.document_reviews(user_id);
create index if not exists tasks_contract_id_idx on public.tasks(contract_id);

-- Keep the original FK index and remove the later duplicate.
drop index if exists public.documents_contract_id_idx;

-- Trigger functions do not need an exposed schema search path.
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

create or replace function public.set_kindergeld_cases_updated_at()
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

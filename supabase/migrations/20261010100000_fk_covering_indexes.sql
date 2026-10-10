-- Advisor remediation: covering indexes for unindexed foreign keys.
--
-- Supabase's performance advisor flags foreign keys without a leading index.
-- Postgres does not create one automatically, so every parent-row delete or
-- update scans the child table, and FK lookups degrade as the tables grow.
-- These indexes only add read paths; they change no data and no policy.

create index if not exists contract_reviews_user_id_idx
  on public.contract_reviews(user_id);
create index if not exists family_members_user_id_idx
  on public.family_members(user_id);
create index if not exists finanzamt_requests_user_id_idx
  on public.finanzamt_requests(user_id);
create index if not exists finanzamt_requests_linked_tax_return_id_idx
  on public.finanzamt_requests(linked_tax_return_id);
create index if not exists opportunity_checks_user_id_idx
  on public.opportunity_checks(user_id);
create index if not exists tax_form_registry_source_id_idx
  on public.tax_form_registry(source_id);
create index if not exists provider_receipts_attempt_id_idx
  on public.provider_receipts(attempt_id);
create index if not exists provider_submission_attempts_provider_id_idx
  on public.provider_submission_attempts(provider_id);
create index if not exists provider_submission_events_attempt_id_idx
  on public.provider_submission_events(attempt_id);

-- Preserved platform_* compatibility surface: non-destructive indexes only.
create index if not exists platform_approvals_case_id_idx
  on public.platform_approvals(case_id);
create index if not exists platform_approvals_draft_id_idx
  on public.platform_approvals(draft_id);
create index if not exists platform_approvals_household_id_idx
  on public.platform_approvals(household_id);
create index if not exists platform_audit_events_actor_user_id_idx
  on public.platform_audit_events(actor_user_id);
create index if not exists platform_cases_contract_id_idx
  on public.platform_cases(contract_id);
create index if not exists platform_correspondence_drafts_case_id_idx
  on public.platform_correspondence_drafts(case_id);
create index if not exists platform_correspondence_drafts_household_id_idx
  on public.platform_correspondence_drafts(household_id);
create index if not exists platform_tasks_case_id_idx
  on public.platform_tasks(case_id);
create index if not exists platform_tasks_contract_id_idx
  on public.platform_tasks(contract_id);

-- P2 — HORIZON first-login onboarding state plus reconciliation of the profile
-- column grants the authenticated application already relies on.
--
-- Additive only: one new nullable-safe column with a default, and column-level
-- grants. No table-wide grant is introduced, no policy is dropped or weakened,
-- and no existing row loses access. Existing owner-scoped RLS on public.profiles
-- is untouched: profiles_read_own already hides other users' rows.

-- Persisted first-login onboarding position. Values are the ordered onboarding
-- steps; 'completed' is terminal.
alter table public.profiles
  add column if not exists onboarding_step text not null default 'language'
    check (onboarding_step in ('language', 'profile', 'tour', 'finish', 'completed'));

-- Accounts that existed before this column are already past first login, so they
-- must never be dropped back into onboarding.
update public.profiles
  set onboarding_step = 'completed'
  where onboarding_step = 'language'
    and created_at < now();

-- Column-level grants only. Every grant below is either the new onboarding column
-- or a column that the profile form writes today but that the migration lineage
-- never granted. Table-wide select/insert/update is deliberately avoided so the
-- grant surface stays explicit.
grant update (onboarding_step) on public.profiles to authenticated;

-- The profile form upserts these columns; without the grants the save is denied
-- even though the columns exist.
grant insert (employment_status, household_size, monthly_income, monthly_fixed_costs, completeness)
  on public.profiles to authenticated;
grant update (employment_status, household_size, monthly_income, monthly_fixed_costs, completeness, updated_at)
  on public.profiles to authenticated;

-- Minimal-profile onboarding writes the person's name and language preference.
-- These columns are new to the application and were never granted. Select needs
-- no new grant: profiles_read_own already limits reads to the user's own row.
grant insert (first_name, last_name, preferred_language) on public.profiles to authenticated;
grant update (first_name, last_name, preferred_language) on public.profiles to authenticated;
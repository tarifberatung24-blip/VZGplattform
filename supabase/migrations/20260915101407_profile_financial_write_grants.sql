-- Reconciled from production migration history (version 20260915101407).
-- This statement was applied to the canonical project directly and never
-- committed; it is restored here verbatim so the repository matches
-- supabase_migrations.schema_migrations. Already applied in production.
grant insert (id, employment_status, household_size, monthly_income, monthly_fixed_costs, completeness, updated_at) on public.profiles to authenticated;
grant update (employment_status, household_size, monthly_income, monthly_fixed_costs, completeness, updated_at) on public.profiles to authenticated;

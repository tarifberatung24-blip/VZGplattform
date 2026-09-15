-- Allow an authenticated user to maintain only their own financial profile fields.
-- Existing profiles_insert_own and profiles_update_own policies still enforce id = auth.uid().
grant insert (id, employment_status, household_size, monthly_income, monthly_fixed_costs, completeness, updated_at)
  on public.profiles to authenticated;
grant update (employment_status, household_size, monthly_income, monthly_fixed_costs, completeness, updated_at)
  on public.profiles to authenticated;

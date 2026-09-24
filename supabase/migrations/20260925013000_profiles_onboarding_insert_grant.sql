-- TAR-14 / P2 — allow the first-login profile upsert to persist onboarding state.
--
-- Production verification showed authenticated can SELECT/UPDATE onboarding_step
-- but cannot INSERT it. The first profile save for a brand-new user is an INSERT
-- via profiles.upsert(), so that path fails without this column-level privilege.
--
-- Additive only: no table-wide grant, no RLS change, no destructive statement.

grant insert (onboarding_step) on public.profiles to authenticated;

-- Affiliate revenue loop: lock the four tables to the service role.
--
-- The affiliate tables (`affiliate_requests`, `affiliate_click_events`,
-- `affiliate_status_events`, `affiliate_commissions`) were created with RLS
-- enabled and no policy, so row-level security already denies every row to
-- `anon` and `authenticated`. What was still wrong is the table-level GRANT:
-- Supabase's default privileges had handed `anon` and `authenticated` full
-- `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` on these tables. RLS made that
-- unreachable through PostgREST, but it left three real exposures:
--
--   1. the tables were still advertised in the auto-generated GraphQL schema
--      (`pg_graphql_anon_table_exposed` / `pg_graphql_authenticated_table_exposed`);
--   2. anything that runs with `BYPASSRLS` or as the table owner could read
--      customer names and e-mail addresses;
--   3. `TRUNCATE` is not subject to RLS at all once the privilege is held.
--
-- These tables hold customer name, e-mail, phone and answers, and are written
-- and read exclusively through `lib/affiliate/analytics-client.ts` with the
-- server-only secret key (service role bypasses RLS by design). So the correct
-- state is: no privileges for `anon` or `authenticated`, full privileges for
-- `service_role`. This is a privilege-only hardening; it is additive to the
-- existing RLS (no policy is added, none is removed) and idempotent.

do $$
declare
  t text;
  tables text[] := array[
    'affiliate_requests',
    'affiliate_click_events',
    'affiliate_status_events',
    'affiliate_commissions'
  ];
begin
  foreach t in array tables loop
    -- Guard: only touch a table that actually exists on this database.
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);

    -- Fail loudly if a default privilege quietly re-granted access.
    if has_table_privilege('anon', 'public.' || t, 'select')
       or has_table_privilege('anon', 'public.' || t, 'insert')
       or has_table_privilege('authenticated', 'public.' || t, 'select')
       or has_table_privilege('authenticated', 'public.' || t, 'insert') then
      raise exception 'affiliate hardening left client roles with access to public.%', t;
    end if;
  end loop;
end $$;

-- Make PostgREST/GraphQL drop the now-unreachable tables from the exposed
-- schema immediately instead of waiting for the next restart.
notify pgrst, 'reload schema';

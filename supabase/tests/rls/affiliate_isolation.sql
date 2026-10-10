-- Affiliate revenue loop: client roles must not reach the money/PII tables.
--
-- Run only against a disposable local/staging database after applying the three
-- affiliate migrations and then:
--   supabase/migrations/20261010090000_affiliate_locked_to_service_role.sql
-- The transaction always rolls back its synthetic fixtures.
--
-- These tables are written and read only through the server-side admin client
-- (`lib/affiliate/analytics-client.ts`, secret key). The point of this file is
-- what a unit test cannot reach: that `anon` and `authenticated` cannot read or
-- write customer names, e-mail addresses, click rows or commission money, and
-- that the service role still can.

begin;

insert into public.affiliate_requests (request_id, kind, locale, customer_name, customer_email)
values ('hz_rls_test_0001', 'energy', 'de', 'RLS Probe', 'probe@example.invalid');

-- anon and authenticated must hold no table privilege at all.
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
    if has_table_privilege('anon', 'public.' || t, 'select')
       or has_table_privilege('anon', 'public.' || t, 'insert')
       or has_table_privilege('anon', 'public.' || t, 'update')
       or has_table_privilege('anon', 'public.' || t, 'delete')
       or has_table_privilege('anon', 'public.' || t, 'truncate') then
      raise exception 'anon still holds a privilege on public.%', t;
    end if;
    if has_table_privilege('authenticated', 'public.' || t, 'select')
       or has_table_privilege('authenticated', 'public.' || t, 'insert')
       or has_table_privilege('authenticated', 'public.' || t, 'update')
       or has_table_privilege('authenticated', 'public.' || t, 'delete')
       or has_table_privilege('authenticated', 'public.' || t, 'truncate') then
      raise exception 'authenticated still holds a privilege on public.%', t;
    end if;
  end loop;
end $$;

-- Even with an authenticated JWT the table itself is unreachable: the table
-- privilege is gone, so the read is denied before RLS even runs. (With the old
-- grant in place this returned 0 rows silently, which is why the grant mattered.)
set role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000a', false);
do $$
begin
  begin
    perform 1 from public.affiliate_requests limit 1;
    raise exception 'authenticated was allowed to read affiliate_requests';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- The service role (the only writer in production) keeps full access.
set role service_role;
do $$
declare n int;
begin
  select count(*) into n from public.affiliate_requests where request_id = 'hz_rls_test_0001';
  if n <> 1 then raise exception 'service_role must still read the request, saw %', n; end if;
end $$;
reset role;

rollback;

-- Inkasso-Check cases: ownership isolation and integrity.
--
-- Run only against a disposable local/staging database after applying the
-- canonical spine migration and then:
--   supabase/migrations/20261002000000_inkasso_cases.sql
-- The transaction always rolls back its synthetic fixtures.
--
-- The point of this file is the parts a unit test cannot reach: row-level
-- security, the updated_at trigger, the check constraints, the document FK and
-- the cascade that backs the DSGVO erasure route.

begin;

insert into auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    'c0000000-0000-4000-8000-00000000000a',
    'inkasso-rls-a@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'c0000000-0000-4000-8000-00000000000b',
    'inkasso-rls-b@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

-- Fixtures are inserted as the table owner so RLS is not a factor here; the
-- assertions below run as `authenticated`.
insert into public.inkasso_cases (id, user_id, locale, case_type, parties, claim)
values
  (
    'c0000000-0000-4000-8000-0000000000c1',
    'c0000000-0000-4000-8000-00000000000a',
    'bg', 'utility_dispute',
    '{"creditor":"Bad Homburger Inkasso GmbH","court":"Amtsgericht Hünfeld"}'::jsonb,
    '{"hauptforderung":1915.65,"total":2427.05}'::jsonb
  ),
  (
    'c0000000-0000-4000-8000-0000000000c2',
    'c0000000-0000-4000-8000-00000000000b',
    'de', 'inkasso', '{}'::jsonb, '{}'::jsonb
  );

set role authenticated;

-- Actor A sees only its own case.
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000a', false);
do $$
declare n int;
begin
  select count(*) into n from public.inkasso_cases;
  if n <> 1 then raise exception 'A must see exactly 1 case, saw %', n; end if;
end $$;

-- A can read the row it owns, with the jsonb groups intact.
do $$
declare credited text;
begin
  select parties ->> 'creditor' into credited
    from public.inkasso_cases
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  if credited <> 'Bad Homburger Inkasso GmbH' then
    raise exception 'A could not read its own parties jsonb, got %', credited;
  end if;
end $$;

-- The updated_at trigger must rewrite the timestamp on update. The harness runs
-- inside one transaction, where now() is fixed for the whole transaction, so the
-- row is first back-dated and then checked for having been moved forward.
do $$
declare after_ts timestamptz;
begin
  update public.inkasso_cases set updated_at = '2000-01-01T00:00:00Z'
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  update public.inkasso_cases set status = 'evaluated'
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  select updated_at into after_ts from public.inkasso_cases
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  if after_ts <= '2000-01-01T00:00:00Z' then
    raise exception 'updated_at trigger did not fire, still %', after_ts;
  end if;
end $$;

-- Actor B sees nothing of A's.
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000b', false);
do $$
declare n int;
begin
  select count(*) into n from public.inkasso_cases
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  if n <> 0 then raise exception 'B must not see A''s case, saw %', n; end if;
end $$;

-- B must not be able to forge a row owned by A (the with-check clause).
do $$
begin
  begin
    insert into public.inkasso_cases (user_id, locale)
    values ('c0000000-0000-4000-8000-00000000000a', 'de');
    raise exception 'B inserted a case owned by A';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B must not be able to update A's row into its own name and thereby steal it.
do $$
begin
  update public.inkasso_cases set user_id = 'c0000000-0000-4000-8000-00000000000b'
   where id = 'c0000000-0000-4000-8000-0000000000c1';
  -- No rows are visible to B, so the update is a no-op rather than an error.
  if found then raise exception 'B updated A''s row'; end if;
end $$;

-- The locale and case_type checks must reject values outside the contract.
do $$
begin
  begin
    insert into public.inkasso_cases (user_id, locale)
    values ('c0000000-0000-4000-8000-00000000000b', 'fr');
    raise exception 'locale check accepted fr';
  exception when check_violation then null;
  end;
  begin
    insert into public.inkasso_cases (user_id, locale, case_type)
    values ('c0000000-0000-4000-8000-00000000000b', 'de', 'invented');
    raise exception 'case_type check accepted invented';
  exception when check_violation then null;
  end;
end $$;

-- B may write its own case.
do $$
begin
  insert into public.inkasso_cases (user_id, locale)
  values ('c0000000-0000-4000-8000-00000000000b', 'de');
end $$;

reset role;

-- anon must have no access at all.
do $$
begin
  if has_table_privilege('anon', 'public.inkasso_cases', 'select') then
    raise exception 'anon still has select';
  end if;
  if has_table_privilege('anon', 'public.inkasso_cases', 'insert') then
    raise exception 'anon still has insert';
  end if;
end $$;

-- The document FK must be enforced.
do $$
begin
  begin
    insert into public.inkasso_cases (user_id, locale, document_id)
    values ('c0000000-0000-4000-8000-00000000000a', 'bg',
            'c0000000-0000-4000-8000-0000000000ff');
    raise exception 'document_id FK was not enforced';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Deleting the user must erase their cases, which is what the DSGVO delete
-- route relies on.
delete from auth.users where id = 'c0000000-0000-4000-8000-00000000000a';
do $$
declare n int;
begin
  select count(*) into n from public.inkasso_cases
   where user_id = 'c0000000-0000-4000-8000-00000000000a';
  if n <> 0 then raise exception 'cascade delete left % rows', n; end if;
end $$;

rollback;

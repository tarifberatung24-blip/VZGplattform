-- T2 audit F4 + F5: privilege-only hardening, no data, no RLS policy on public tables touched.
--
-- F4. Supabase's default privileges gave `anon` full SELECT/INSERT/UPDATE/DELETE/
-- TRUNCATE/REFERENCES/TRIGGER on every table created in `public`. Row level
-- security is enabled on all of them, and the only policy granted to `anon` is
-- `leads_anon_insert` on `public.leads`, so signed-out callers already receive no
-- rows through PostgREST. The table grants are still unnecessary exposure:
-- TRUNCATE is not subject to RLS, the tables are advertised to signed-out
-- callers in the API schema, and any later permissive policy written without a
-- `to authenticated` clause would immediately reach signed-out callers.
-- Audit (2026-10-10, production, catalog only): no anon-executable function
-- reads these tables; `leads` already holds INSERT only and is left unchanged.
--
-- The future-table default privilege for role `postgres` is revoked too, so new
-- tables no longer start with anon access. A table that should be reachable
-- signed-out must now grant it explicitly together with an `anon` policy.
-- `authenticated` and `service_role` privileges are not changed.
--
-- F5. `document_storage_owner_{insert,select,delete}` on storage.objects compare
-- path segment 2 with auth.uid(), but every upload path is
-- `households/{household_id}/...` and no household id equals its owner id
-- (production: 0 of 27). These three policies therefore never match. The
-- working policies are `kintex_documents_{insert,select,delete}`, which check
-- household ownership. Dropping the dead ones changes no access.
--
-- Idempotent. Reversible by re-granting / re-creating the dropped policies from
-- 20260914124031_documents_storage_bucket.sql.

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname <> 'leads'
  loop
    execute format('revoke all on table public.%I from anon', t.relname);
  end loop;
end $$;

alter default privileges for role postgres in schema public revoke all on tables from anon;

drop policy if exists document_storage_owner_insert on storage.objects;
drop policy if exists document_storage_owner_select on storage.objects;
drop policy if exists document_storage_owner_delete on storage.objects;

-- Fail loudly if anything is left behind or if the signed-out lead form broke.
do $$
declare
  leftover text;
begin
  select string_agg(c.relname, ', ')
    into leftover
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname <> 'leads'
    and has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE');
  if leftover is not null then
    raise exception 'anon still holds table privileges on: %', leftover;
  end if;

  if to_regclass('public.leads') is not null
     and not has_table_privilege('anon', 'public.leads', 'INSERT') then
    raise exception 'anon lost INSERT on public.leads (public contact form)';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'document_storage_owner_%'
  ) then
    raise exception 'dead document_storage_owner_* policies still present';
  end if;
end $$;

notify pgrst, 'reload schema';

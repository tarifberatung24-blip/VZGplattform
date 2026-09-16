-- VZGplattform runtime RPC. Keep the earlier migration files immutable as schema history.
create or replace function public.ensure_vzg_household()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  household uuid;
begin
  if current_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 0));
  insert into public.profiles (id) values (current_user_id) on conflict (id) do nothing;
  select id into household from public.households where owner_id = current_user_id order by created_at, id limit 1;
  if household is null then
    insert into public.households (owner_id, name, country) values (current_user_id, 'VZGplattform', 'DE') returning id into household;
  end if;
  return household;
end;
$$;
revoke all on function public.ensure_vzg_household() from public, anon;
grant execute on function public.ensure_vzg_household() to authenticated;

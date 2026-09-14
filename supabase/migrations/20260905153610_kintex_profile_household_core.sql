-- One canonical Supabase project. Extend existing models without replacing data.
alter table public.profiles
  add column if not exists employment_status text,
  add column if not exists household_size integer check (household_size > 0),
  add column if not exists monthly_income numeric(14,2) check (monthly_income >= 0),
  add column if not exists monthly_fixed_costs numeric(14,2) check (monthly_fixed_costs >= 0),
  add column if not exists completeness integer not null default 0 check (completeness between 0 and 100);

create or replace function public.ensure_kintex_household()
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
    insert into public.households (owner_id, name, country) values (current_user_id, 'KintexBG', 'DE') returning id into household;
  end if;
  return household;
end;
$$;
revoke all on function public.ensure_kintex_household() from public, anon;
grant execute on function public.ensure_kintex_household() to authenticated;

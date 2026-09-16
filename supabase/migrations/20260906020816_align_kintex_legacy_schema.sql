-- Additive compatibility layer for the existing KintexBG project.
-- Existing v0 columns and owner-based RLS policies remain intact.

alter table public.profiles
  add column if not exists employment_status text,
  add column if not exists household_size integer check (household_size > 0),
  add column if not exists monthly_income numeric(14,2) check (monthly_income >= 0),
  add column if not exists monthly_fixed_costs numeric(14,2) check (monthly_fixed_costs >= 0),
  add column if not exists completeness integer not null default 0 check (completeness between 0 and 100);

alter table public.households
  add column if not exists country text not null default 'DE';

insert into public.households (owner_id, name, country)
select p.id, 'KintexBG', 'DE'
from public.profiles p
where not exists (
  select 1 from public.households h where h.owner_id = p.id
);

alter table public.contracts
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists title text,
  add column if not exists provider_name text,
  add column if not exists monthly_amount numeric(14,2) check (monthly_amount >= 0);

update public.contracts c
set household_id = h.id,
    title = coalesce(c.title, c.provider, initcap(replace(c.category, '_', ' '))),
    provider_name = coalesce(c.provider_name, c.provider),
    monthly_amount = coalesce(c.monthly_amount, c.monthly_cost)
from public.households h
where h.owner_id = c.user_id
  and (c.household_id is null or c.title is null or c.provider_name is null or c.monthly_amount is null);

create index if not exists contracts_household_id_idx on public.contracts(household_id);

alter table public.documents
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists original_filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint check (size_bytes >= 0),
  add column if not exists processing_status text;

update public.documents d
set household_id = h.id,
    original_filename = coalesce(d.original_filename, d.name),
    processing_status = coalesce(d.processing_status, d.status)
from public.households h
where h.owner_id = d.user_id
  and (d.household_id is null or d.original_filename is null or d.processing_status is null);

create index if not exists documents_household_id_idx on public.documents(household_id);

alter table public.audit_events
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists event_summary text;

update public.audit_events a
set household_id = h.id,
    actor_user_id = coalesce(a.actor_user_id, a.user_id),
    entity_type = coalesce(a.entity_type, case when a.document_id is null then 'system' else 'document' end),
    entity_id = coalesce(a.entity_id, a.document_id),
    event_summary = coalesce(a.event_summary, a.event_type)
from public.households h
where h.owner_id = a.user_id
  and (a.household_id is null or a.actor_user_id is null or a.entity_type is null or a.event_summary is null);

create index if not exists audit_events_household_id_idx on public.audit_events(household_id);

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
  select id into household
  from public.households
  where owner_id = current_user_id
  order by created_at, id
  limit 1;

  if household is null then
    insert into public.households (owner_id, name, country)
    values (current_user_id, 'KintexBG', 'DE')
    returning id into household;
  end if;

  return household;
end;
$$;

revoke all on function public.ensure_kintex_household() from public, anon;
grant execute on function public.ensure_kintex_household() to authenticated;

create or replace function public.sync_kintex_contract_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.user_id := coalesce(
      (select owner_id from public.households where id = new.household_id),
      auth.uid()
    );
  end if;
  if new.household_id is null then
    select id into new.household_id
    from public.households
    where owner_id = new.user_id
    order by created_at, id
    limit 1;
  end if;

  if tg_op = 'INSERT' then
    new.provider_name := coalesce(new.provider_name, new.provider);
    new.provider := coalesce(new.provider, new.provider_name);
    new.monthly_amount := coalesce(new.monthly_amount, new.monthly_cost);
    new.monthly_cost := coalesce(new.monthly_cost, new.monthly_amount);
  else
    if new.provider_name is distinct from old.provider_name then new.provider := new.provider_name;
    elsif new.provider is distinct from old.provider then new.provider_name := new.provider;
    end if;
    if new.monthly_amount is distinct from old.monthly_amount then new.monthly_cost := new.monthly_amount;
    elsif new.monthly_cost is distinct from old.monthly_cost then new.monthly_amount := new.monthly_cost;
    end if;
  end if;
  new.title := coalesce(new.title, new.provider_name, initcap(replace(new.category, '_', ' ')));
  return new;
end;
$$;

drop trigger if exists sync_kintex_contract_columns on public.contracts;
create trigger sync_kintex_contract_columns
before insert or update on public.contracts
for each row execute function public.sync_kintex_contract_columns();

create or replace function public.sync_kintex_document_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is null then
    new.user_id := coalesce(
      (select owner_id from public.households where id = new.household_id),
      auth.uid()
    );
  end if;
  if new.household_id is null then
    select id into new.household_id
    from public.households
    where owner_id = new.user_id
    order by created_at, id
    limit 1;
  end if;

  if tg_op = 'INSERT' then
    new.original_filename := coalesce(new.original_filename, new.name);
    new.name := coalesce(new.name, new.original_filename);
    if new.processing_status is not null then new.status := new.processing_status;
    else new.processing_status := new.status;
    end if;
  else
    if new.original_filename is distinct from old.original_filename then new.name := new.original_filename;
    elsif new.name is distinct from old.name then new.original_filename := new.name;
    end if;
    if new.processing_status is distinct from old.processing_status then new.status := new.processing_status;
    elsif new.status is distinct from old.status then new.processing_status := new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_kintex_document_columns on public.documents;
create trigger sync_kintex_document_columns
before insert or update on public.documents
for each row execute function public.sync_kintex_document_columns();

create or replace function public.sync_kintex_audit_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.user_id := coalesce(new.user_id, new.actor_user_id, auth.uid());
  new.actor_user_id := coalesce(new.actor_user_id, new.user_id);
  if new.household_id is null then
    select id into new.household_id
    from public.households
    where owner_id = new.user_id
    order by created_at, id
    limit 1;
  end if;
  new.document_id := coalesce(new.document_id, case when new.entity_type = 'document' then new.entity_id end);
  new.entity_type := coalesce(new.entity_type, case when new.document_id is null then 'system' else 'document' end);
  new.entity_id := coalesce(new.entity_id, new.document_id);
  new.event_summary := coalesce(new.event_summary, new.event_type);
  return new;
end;
$$;

drop trigger if exists sync_kintex_audit_columns on public.audit_events;
create trigger sync_kintex_audit_columns
before insert or update on public.audit_events
for each row execute function public.sync_kintex_audit_columns();

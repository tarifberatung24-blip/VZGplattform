-- Unify public contact-form leads and authenticated expert-request leads in one table.
--
-- Context: 20260916000000_contact_leads_table.sql created `leads` for the public site
-- contact form (name/email/message/locale/origin, anonymous insert only). The dashboard
-- "contact expert" flow additionally needs caller-owned rows (user_id/household_id/status).
-- Both shapes now live in the same table so that lead reporting has a single source of truth.
--
-- Safety: additive and idempotent. It runs after the public table already exists, never
-- drops data, and tightens the previous permissive anonymous insert policy
-- (`with check (true)`), which allowed an anonymous visitor to forge an owner id.

-- 1. Authenticated-lead columns. Nullable, because a public lead has no session.
--    Provenance deliberately reuses the existing `origin` column instead of adding a
--    duplicate `source` column: `origin` already records where a lead came from
--    ('site_contact_form', 'dashboard_expert_form', ...).
alter table public.leads
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists phone text,
  add column if not exists screening_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'new';

-- 2. Length and lifecycle guards, matching the API validation contract.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_status_allowed') then
    alter table public.leads
      add constraint leads_status_allowed
      check (status in ('new', 'contacted', 'qualified', 'closed'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_name_length') then
    alter table public.leads
      add constraint leads_name_length check (char_length(name) between 1 and 160);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_email_length') then
    alter table public.leads
      add constraint leads_email_length check (char_length(email) between 3 and 320);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_message_length') then
    alter table public.leads
      add constraint leads_message_length check (message is null or char_length(message) <= 4000);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_phone_length') then
    alter table public.leads
      add constraint leads_phone_length check (phone is null or char_length(phone) <= 40);
  end if;

  -- A public lead is unattributed; an authenticated lead belongs to exactly one household.
  if not exists (select 1 from pg_constraint where conname = 'leads_ownership_shape') then
    alter table public.leads
      add constraint leads_ownership_shape
      check (
        (user_id is null and household_id is null)
        or (user_id is not null and household_id is not null)
      );
  end if;
end $$;

-- 3. Lookup paths used by the lead API routes.
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists leads_household_id_idx on public.leads(household_id);
create index if not exists leads_created_at_idx on public.leads(created_at desc);

-- 4. Row level security: anonymous visitors may only submit unattributed leads, and
--    authenticated users may only read or submit rows inside their own household.
alter table public.leads enable row level security;

drop policy if exists leads_insert_public on public.leads;
drop policy if exists leads_insert_own on public.leads;
drop policy if exists leads_select_own on public.leads;

create policy leads_insert_public on public.leads
  for insert to anon, authenticated
  with check (user_id is null and household_id is null);

create policy leads_insert_own on public.leads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = (select auth.uid())
    )
  );

create policy leads_select_own on public.leads
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 5. Explicit privileges. Anonymous visitors may insert but never read leads.
revoke all on public.leads from anon;
grant insert on public.leads to anon;
grant insert, select on public.leads to authenticated;
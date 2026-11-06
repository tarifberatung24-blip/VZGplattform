-- HORIZON Business Profile MVP. One workspace per authenticated user.
create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 2 and 160),
  legal_form text not null check (legal_form in ('einzelunternehmen','freiberufler','gbr','ug','gmbh','gmbh_co_kg','ag','other')),
  industry text not null check (char_length(btrim(industry)) between 2 and 120),
  activity_description text,
  street_address text,
  postal_code text,
  city text,
  vat_id text,
  tax_number text,
  trade_register_number text,
  founded_on date,
  employee_count integer check (employee_count is null or employee_count between 0 and 1000000),
  annual_revenue_band text check (annual_revenue_band is null or annual_revenue_band in ('unknown','under_22k','22k_50k','50k_100k','100k_250k','250k_500k','over_500k')),
  bookkeeping_method text check (bookkeeping_method is null or bookkeeping_method in ('unknown','euer','bilanz','not_sure')),
  e_invoice_status text check (e_invoice_status is null or e_invoice_status in ('not_started','preparing','ready','using','not_sure')),
  business_goals text[] not null default '{}',
  business_challenges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_one_per_owner unique (owner_id)
);
alter table public.business_profiles enable row level security;
create policy business_profiles_select_own on public.business_profiles for select to authenticated using ((select auth.uid()) = owner_id);
create policy business_profiles_insert_own on public.business_profiles for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy business_profiles_update_own on public.business_profiles for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select on public.business_profiles to authenticated;
grant insert (owner_id,business_name,legal_form,industry,activity_description,street_address,postal_code,city,vat_id,tax_number,trade_register_number,founded_on,employee_count,annual_revenue_band,bookkeeping_method,e_invoice_status,business_goals,business_challenges,updated_at) on public.business_profiles to authenticated;
grant update (owner_id,business_name,legal_form,industry,activity_description,street_address,postal_code,city,vat_id,tax_number,trade_register_number,founded_on,employee_count,annual_revenue_band,bookkeeping_method,e_invoice_status,business_goals,business_challenges,updated_at) on public.business_profiles to authenticated;
create index if not exists business_profiles_owner_updated_idx on public.business_profiles(owner_id, updated_at desc);

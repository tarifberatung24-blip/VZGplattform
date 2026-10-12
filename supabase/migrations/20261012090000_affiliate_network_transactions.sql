-- Affiliate network transactions (Awin first).
--
-- One row per transaction the network reports back for a HORIZON partner click.
-- The click id travels to the network as the sub-ID (`clickRef` at Awin), so a
-- transaction can be tied back to `affiliate_click_events` and, through it, to
-- the customer's evidenced saving. Rows are written only by the daily
-- reconciliation run with the service role; client roles have no access.
--
-- Commission and sale amounts are stored as reported by the network, in integer
-- cents. HORIZON never estimates them.

create table if not exists public.affiliate_network_transactions (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('awin')),
  network_transaction_id text not null check (char_length(network_transaction_id) between 1 and 64),
  click_event_id uuid references public.affiliate_click_events(id) on delete set null,
  advertiser_id text check (advertiser_id is null or char_length(advertiser_id) <= 32),
  status text not null check (status in ('pending', 'approved', 'declined', 'deleted')),
  transaction_type text check (transaction_type is null or char_length(transaction_type) <= 32),
  commission_cents integer check (commission_cents is null or commission_cents >= 0),
  sale_cents integer check (sale_cents is null or sale_cents >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  transaction_date timestamptz,
  validation_date timestamptz,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affiliate_network_transactions_network_key unique (network, network_transaction_id)
);

create index if not exists affiliate_network_transactions_click_event_id_idx
  on public.affiliate_network_transactions(click_event_id);
create index if not exists affiliate_network_transactions_status_date_idx
  on public.affiliate_network_transactions(status, transaction_date desc);

alter table public.affiliate_network_transactions enable row level security;
-- Intentionally no policy: service-role only, like the other affiliate tables.

revoke all on table public.affiliate_network_transactions from anon;
revoke all on table public.affiliate_network_transactions from authenticated;
grant select, insert, update, delete on table public.affiliate_network_transactions to service_role;

do $$
begin
  if has_table_privilege('anon', 'public.affiliate_network_transactions', 'select')
     or has_table_privilege('authenticated', 'public.affiliate_network_transactions', 'select') then
    raise exception 'affiliate_network_transactions left client roles with access';
  end if;
end $$;

create or replace function public.set_affiliate_network_transactions_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists affiliate_network_transactions_updated_at on public.affiliate_network_transactions;
create trigger affiliate_network_transactions_updated_at
before update on public.affiliate_network_transactions
for each row execute function public.set_affiliate_network_transactions_updated_at();

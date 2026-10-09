-- Affiliate revenue loop: commission ledger.
--
-- This is the money end of the loop. One row per (request, offer) conversion,
-- with the payout held as integer cents so no rounding happens at read time.
-- The unique key makes a repeated operator callback idempotent instead of
-- double-paying, and the status column lets a payout run reconcile exactly which
-- conversions were approved and settled.
--
-- `affiliate_status_events` records lifecycle history; this table records money.
-- Kept separate on purpose: a request can be `closed` with no commission (no
-- conversion) and a commission can be `rejected` long after the request closed.
--
-- Service-role only: RLS is enabled with no policy. Additive and idempotent.

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  offer_id text not null
    check (offer_id in ('business-insurance', 'kfz', 'energy', 'credit', 'schufa')),
  model text not null
    check (model in ('cpa', 'revenue_share', 'hybrid')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paid')),
  -- Integer cents. The application computes this from stated inputs; the database
  -- never derives money.
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  external_reference text,
  note text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Referential integrity for money: a commission always ties to a real request,
  -- and a request with commissions cannot be deleted out from under the ledger.
  constraint affiliate_commissions_request_fk
    foreign key (request_id) references public.affiliate_requests(request_id) on delete restrict,
  constraint affiliate_commissions_request_offer_key unique (request_id, offer_id)
);

create index if not exists affiliate_commissions_status_created_idx
  on public.affiliate_commissions(status, created_at desc);
create index if not exists affiliate_commissions_offer_created_idx
  on public.affiliate_commissions(offer_id, created_at desc);

alter table public.affiliate_commissions enable row level security;
-- Intentionally no policy: service-role only.

create or replace function public.set_affiliate_commissions_updated_at()
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

drop trigger if exists affiliate_commissions_updated_at on public.affiliate_commissions;
create trigger affiliate_commissions_updated_at
before update on public.affiliate_commissions
for each row execute function public.set_affiliate_commissions_updated_at();

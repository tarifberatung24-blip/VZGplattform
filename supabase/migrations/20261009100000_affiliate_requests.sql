-- Affiliate revenue loop: persist incoming service requests and record every
-- outbound affiliate click.
--
-- Before this migration `/api/service-requests` only forwarded the payload to the
-- automation webhook and stored nothing: if the webhook was down or unconfigured,
-- the customer request was lost and no one could reconcile a partner payout with a
-- real customer. This migration adds the two durable surfaces the revenue loop
-- needs.
--
-- Both tables are service-role only. The public routes write them through the
-- server-side admin client; RLS is enabled with no policy, so anon/authenticated
-- clients can neither read nor write customer names and e-mail addresses. The
-- service role bypasses RLS by design.
--
-- Additive and idempotent: no existing table is altered or dropped.

-- 1. One row per customer request. `request_id` is the same `hz_<uuid>` the site
--    returns to the customer and sends to the orchestrator, so the two halves can
--    be joined without guessing.
create table if not exists public.affiliate_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  kind text not null check (kind in ('energy', 'kfz', 'credit', 'schufa')),
  locale text not null check (locale in ('bg', 'de')),
  source text,
  landing_url text,
  referrer text,
  user_agent text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  answers jsonb not null default '{}'::jsonb,
  consent boolean not null default false,
  sla_minutes integer not null default 120,
  promised_response_by timestamptz,
  -- `status` is the customer-facing lifecycle, advanced by the operator callback.
  status text not null default 'queued'
    check (status in ('queued', 'in_review', 'sent', 'waiting_customer', 'closed', 'cancelled')),
  -- `forward_status` records only the outbound webhook attempt, so a lost hand-off
  -- is visible even when the request itself was saved.
  forward_status text not null default 'pending'
    check (forward_status in ('pending', 'forwarded', 'failed', 'not_configured')),
  forward_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliate_requests_status_created_idx
  on public.affiliate_requests(status, created_at desc);
create index if not exists affiliate_requests_kind_created_idx
  on public.affiliate_requests(kind, created_at desc);

alter table public.affiliate_requests enable row level security;
-- Intentionally no policy: service-role only. Do not add an anon/authenticated
-- read policy here; this table holds personal data.

create or replace function public.set_affiliate_requests_updated_at()
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

drop trigger if exists affiliate_requests_updated_at on public.affiliate_requests;
create trigger affiliate_requests_updated_at
before update on public.affiliate_requests
for each row execute function public.set_affiliate_requests_updated_at();

-- 2. One row per click that leaves the site towards a partner deeplink. This is
--    the only first-party measurement of which offer and channel earn commission.
--    No raw IP is stored; `ip_hash` is a salted hash or null.
create table if not exists public.affiliate_click_events (
  id uuid primary key default gen_random_uuid(),
  offer_id text not null
    check (offer_id in ('business-insurance', 'kfz', 'energy', 'credit', 'schufa')),
  locale text check (locale in ('bg', 'de')),
  path text,
  referrer text,
  user_agent text,
  ip_hash text,
  occurred_at timestamptz not null default now()
);

create index if not exists affiliate_click_events_offer_occurred_idx
  on public.affiliate_click_events(offer_id, occurred_at desc);

alter table public.affiliate_click_events enable row level security;
-- Intentionally no policy: service-role only.

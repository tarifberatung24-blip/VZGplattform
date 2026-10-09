-- Affiliate revenue loop: append-only lifecycle ledger for service requests.
--
-- `affiliate_requests.status` is the current customer-facing state; this table is
-- its history. Every operator callback that actually advances the status writes
-- one row here, so "what happened to this request and when" is answerable without
-- trusting logs, and a payout can be reconciled against the exact sequence of
-- states.
--
-- Service-role only: RLS is enabled with no policy, matching affiliate_requests.
-- Additive and idempotent: no existing table is altered or dropped.

create table if not exists public.affiliate_status_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  status text not null
    check (status in ('queued', 'in_review', 'sent', 'waiting_customer', 'closed', 'cancelled')),
  note text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_status_events_request_created_idx
  on public.affiliate_status_events(request_id, created_at desc);

alter table public.affiliate_status_events enable row level security;
-- Intentionally no policy: service-role only.

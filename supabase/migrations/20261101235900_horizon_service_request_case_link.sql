-- HORIZON service requests: connect public requests to owner-scoped cases.
-- Additive and idempotent. Personal request rows remain service-role only.

alter table public.affiliate_requests
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists case_id uuid references public.cases(id) on delete set null;

-- The original affiliate request migration predates the HORIZON free services.
-- Replace its narrow kind check with the complete public request vocabulary.
alter table public.affiliate_requests drop constraint if exists affiliate_requests_kind_check;
alter table public.affiliate_requests add constraint affiliate_requests_kind_check
  check (kind in (
    'energy', 'kfz', 'credit', 'schufa',
    'wohnungsanmeldung', 'abmeldung_ummeldung', 'steuererklaerung',
    'krankenkassenwechsel', 'gewerbeanmeldung', 'fuehrerschein_umschreibung',
    'aufenthaltstitel', 'beglaubigungen_uebersetzungen'
  ));

create index if not exists affiliate_requests_user_id_idx
  on public.affiliate_requests(user_id, created_at desc);
create index if not exists affiliate_requests_case_id_idx
  on public.affiliate_requests(case_id);

-- Authenticated users never read this table directly. The server-side claim
-- endpoint matches the authenticated email before linking a row to the profile.

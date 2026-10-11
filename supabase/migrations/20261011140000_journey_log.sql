-- Journey log, part 1: opt-in consent and per-user usage events.
--
-- `user_consents` records an explicit, withdrawable opt-in. `product_events`
-- stores which module/step a consenting user visited and a short error code.
-- It has no free-text or JSON column on purpose: nothing a user typed, and no
-- document or contract content, can end up in it.
--
-- Both tables are written and read only by server code with the service-role
-- key (`lib/journey/*`). RLS is enabled with no policy and every privilege is
-- revoked from anon/authenticated, as for the affiliate and site_pages tables.
-- Server code checks `user_consents` before every insert and deletes a user's
-- events when consent is withdrawn.

create table if not exists public.user_consents (
  user_id      uuid not null references auth.users(id) on delete cascade,
  purpose      text not null check (purpose in ('product_journey')),
  granted      boolean not null,
  text_version text not null check (char_length(text_version) between 1 and 40),
  source       text not null check (source in ('signup', 'settings')),
  granted_at   timestamptz,
  revoked_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, purpose)
);

create table if not exists public.product_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  event      text not null check (event in ('page_view', 'client_error')),
  module     text not null check (module ~ '^[a-z][a-z-]{0,39}$'),
  step       text check (step is null or step ~ '^[a-z][a-z-]{0,39}$'),
  code       text check (code is null or code ~ '^[A-Za-z0-9_.:-]{1,40}$'),
  session_id text check (session_id is null or session_id ~ '^[A-Za-z0-9-]{8,64}$'),
  locale     text check (locale is null or locale in ('bg', 'de')),
  created_at timestamptz not null default now()
);

create index if not exists product_events_user_created_idx
  on public.product_events(user_id, created_at desc);
create index if not exists product_events_created_idx
  on public.product_events(created_at);

alter table public.user_consents enable row level security;
alter table public.product_events enable row level security;

revoke all on table public.user_consents from anon, authenticated;
revoke all on table public.product_events from anon, authenticated;
grant all on table public.user_consents to service_role;
grant all on table public.product_events to service_role;

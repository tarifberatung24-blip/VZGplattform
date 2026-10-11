-- Visual page editor (Puck): stored page layouts.
--
-- Read and written only through server code with the service-role key
-- (`lib/puck/pages.ts`). RLS is enabled with no policy and every privilege is
-- revoked from anon/authenticated, matching the affiliate tables.
-- Editing rights are checked in server actions against EDITOR_ADMIN_EMAILS.

create table if not exists public.site_pages (
  id          uuid primary key default gen_random_uuid(),
  locale      text not null check (locale in ('bg', 'de')),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  data        jsonb not null default '{"content":[],"root":{"props":{}}}'::jsonb,
  published   boolean not null default false,
  updated_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (locale, slug)
);

alter table public.site_pages enable row level security;

revoke all on table public.site_pages from anon, authenticated;
grant all on table public.site_pages to service_role;

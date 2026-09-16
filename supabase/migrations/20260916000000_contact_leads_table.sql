-- Create a public leads table for the site contact form.
-- This table is intentionally simple and public for form submissions.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  locale text,
  origin text
);

alter table leads enable row level security;

-- Public site forms may insert leads.
create policy leads_insert_public on leads for insert to public
  with check (true);

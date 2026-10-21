create table public.document_translations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  case_id uuid not null,
  document_id uuid not null,
  version integer not null check (version > 0),
  source_locale text not null check (source_locale in ('bg','de','ru','pl','sr','ro')),
  target_locale text not null check (target_locale in ('bg','de','ru','pl','sr','ro')),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  content text not null check (length(content) between 1 and 150000),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  model text not null check (length(model) between 1 and 120),
  prompt_version text not null check (length(prompt_version) between 1 and 120),
  review_status text not null default 'pending' check (review_status in ('pending','pass','revise','block')),
  created_at timestamptz not null default now(),
  constraint document_translations_distinct_locales check (source_locale <> target_locale),
  constraint document_translations_document_fk
    foreign key (document_id, case_id, owner_id)
    references public.source_documents(id, case_id, owner_id)
    on delete cascade,
  constraint document_translations_version_key unique (document_id, target_locale, version),
  constraint document_translations_content_key unique (document_id, target_locale, source_sha256, content_hash)
);

alter table public.document_translations enable row level security;
revoke all on table public.document_translations from anon, authenticated;
grant select on table public.document_translations to authenticated;
grant all on table public.document_translations to service_role;

create policy document_translations_read_own
on public.document_translations
for select
to authenticated
using ((select auth.uid()) = owner_id);

create index document_translations_owner_case_idx
on public.document_translations(owner_id, case_id, created_at desc);

create index document_translations_document_idx
on public.document_translations(document_id, target_locale, version desc);

create function public.reject_document_translation_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Document translations are immutable; insert a new version';
end;
$$;

revoke all on function public.reject_document_translation_update() from public, anon, authenticated;

create trigger immutable_document_translation
before update on public.document_translations
for each row execute function public.reject_document_translation_update();

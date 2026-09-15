-- Add persistent per-user language preferences required by the authenticated application.
-- Non-destructive: existing rows receive safe defaults and existing RLS policies remain active.
alter table public.profiles
  add column if not exists conversation_locale text not null default 'bg'
    check (conversation_locale in ('bg','de','ru','pl','sr','ro'));
alter table public.profiles
  add column if not exists output_locale text not null default 'de'
    check (output_locale in ('bg','de','ru','pl','sr','ro'));
grant insert (id, locale, conversation_locale, output_locale, display_name)
  on public.profiles to authenticated;
grant update (locale, conversation_locale, output_locale, display_name)
  on public.profiles to authenticated

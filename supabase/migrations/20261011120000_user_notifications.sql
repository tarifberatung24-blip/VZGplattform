-- HORIZON notifications: an in-app inbox ("Пощенска кутия" in MyHorizon) plus the
-- per-user switch for the matching e-mails.
--
-- Rows are generated on the server from the user's own data (reports, reminders
-- before a cancellation deadline, a nudge for inactive accounts). The text is not
-- stored: `kind` and `payload` hold the facts and the UI renders them in the
-- user's language. Additive only: two new tables, no existing object changes.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('first_win', 'report_day14', 'report_monthly', 'inactive_nudge', 'deadline_30', 'deadline_7')),
  -- One notification per rule and occasion, so a re-run never duplicates.
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  emailed_at timestamptz,
  constraint user_notifications_user_dedupe_key unique (user_id, dedupe_key)
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_pending_email_idx
  on public.user_notifications(created_at)
  where emailed_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_owner_select on public.user_notifications;
create policy user_notifications_owner_select
on public.user_notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_notifications_owner_mark_read on public.user_notifications;
create policy user_notifications_owner_mark_read
on public.user_notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.user_notifications from anon;
revoke all on table public.user_notifications from authenticated;
grant select on table public.user_notifications to authenticated;
-- Owners may only mark their notifications as read; everything else is server-side.
grant update (read_at) on table public.user_notifications to authenticated;
grant all on table public.user_notifications to service_role;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_owner_all on public.notification_preferences;
create policy notification_preferences_owner_all
on public.notification_preferences
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.notification_preferences from anon;
revoke all on table public.notification_preferences from authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;

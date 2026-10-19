-- HORIZON Forum: authenticated community discussions, feedback and official notices.
--
-- The forum deliberately stores no attachments and no public profile data.  Members are shown
-- only as "community members"; author UUIDs remain unavailable through the Data API.  Official
-- notices are created by a server-side administrator action after the existing admin allow-list
-- check.  Every table in the exposed public schema has RLS and explicit, minimum grants.

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_type text not null default 'member'
    check (author_type in ('member', 'official')),
  category text not null
    check (category in ('community', 'feedback', 'announcement')),
  official_topic text
    check (official_topic in ('platform', 'law', 'promotion', 'innovation')),
  title text not null check (char_length(btrim(title)) between 3 and 140),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint forum_posts_author_category_check check (
    (author_type = 'member' and category in ('community', 'feedback') and official_topic is null)
    or
    (author_type = 'official' and category = 'announcement' and official_topic is not null)
  )
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_post_reactions (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'helpful' check (reaction = 'helpful'),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  constraint forum_reports_one_target_check check (
    (post_id is not null and comment_id is null)
    or
    (post_id is null and comment_id is not null)
  )
);

create unique index if not exists forum_reports_one_post_per_member_idx
  on public.forum_reports(reporter_id, post_id)
  where post_id is not null;
create unique index if not exists forum_reports_one_comment_per_member_idx
  on public.forum_reports(reporter_id, comment_id)
  where comment_id is not null;
create index if not exists forum_posts_feed_idx
  on public.forum_posts(is_pinned desc, created_at desc)
  where status = 'published';
create index if not exists forum_comments_post_created_idx
  on public.forum_comments(post_id, created_at asc)
  where status = 'published';
create index if not exists forum_reports_open_created_idx
  on public.forum_reports(created_at asc)
  where status = 'open';

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_post_reactions enable row level security;
alter table public.forum_reports enable row level security;

create policy forum_posts_member_read
on public.forum_posts for select to authenticated
using (status = 'published' or (select auth.uid()) = author_id);

create policy forum_posts_member_create
on public.forum_posts for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and author_type = 'member'
  and category in ('community', 'feedback')
  and official_topic is null
  and status = 'published'
  and is_pinned = false
  and is_locked = false
);

create policy forum_posts_member_update
on public.forum_posts for update to authenticated
using ((select auth.uid()) = author_id and author_type = 'member')
with check (
  (select auth.uid()) = author_id
  and author_type = 'member'
  and category in ('community', 'feedback')
  and official_topic is null
  and status = 'published'
  and is_pinned = false
  and is_locked = false
);

create policy forum_posts_member_delete
on public.forum_posts for delete to authenticated
using ((select auth.uid()) = author_id and author_type = 'member');

create policy forum_comments_member_read
on public.forum_comments for select to authenticated
using (status = 'published' or (select auth.uid()) = author_id);

create policy forum_comments_member_create
on public.forum_comments for insert to authenticated
with check (
  (select auth.uid()) = author_id
  and status = 'published'
  and exists (
    select 1 from public.forum_posts
    where id = post_id and status = 'published' and is_locked = false
  )
);

create policy forum_comments_member_update
on public.forum_comments for update to authenticated
using ((select auth.uid()) = author_id)
with check ((select auth.uid()) = author_id and status = 'published');

create policy forum_comments_member_delete
on public.forum_comments for delete to authenticated
using ((select auth.uid()) = author_id);

create policy forum_reactions_member_read_own
on public.forum_post_reactions for select to authenticated
using ((select auth.uid()) = user_id);

create policy forum_reactions_member_create
on public.forum_post_reactions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.forum_posts
    where id = post_id and status = 'published'
  )
);

create policy forum_reactions_member_delete
on public.forum_post_reactions for delete to authenticated
using ((select auth.uid()) = user_id);

create policy forum_reports_member_create
on public.forum_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id and status = 'open');

revoke all on table public.forum_posts from anon, authenticated;
revoke all on table public.forum_comments from anon, authenticated;
revoke all on table public.forum_post_reactions from anon, authenticated;
revoke all on table public.forum_reports from anon, authenticated;

-- A member never receives another member's stable author identifier through the Data API.
grant select (id, author_type, category, official_topic, title, body, status, is_pinned, is_locked, created_at)
  on public.forum_posts to authenticated;
grant insert (author_id, author_type, category, official_topic, title, body, status, is_pinned, is_locked)
  on public.forum_posts to authenticated;
grant update (category, title, body) on public.forum_posts to authenticated;
grant delete on public.forum_posts to authenticated;

grant select (id, post_id, body, status, created_at) on public.forum_comments to authenticated;
grant insert (post_id, author_id, body, status) on public.forum_comments to authenticated;
grant update (body) on public.forum_comments to authenticated;
grant delete on public.forum_comments to authenticated;

grant select (post_id, reaction) on public.forum_post_reactions to authenticated;
grant insert (post_id, user_id, reaction) on public.forum_post_reactions to authenticated;
grant delete on public.forum_post_reactions to authenticated;

grant insert (reporter_id, post_id, comment_id, reason, status) on public.forum_reports to authenticated;

grant all on table public.forum_posts, public.forum_comments, public.forum_post_reactions, public.forum_reports to service_role;

notify pgrst, 'reload schema';

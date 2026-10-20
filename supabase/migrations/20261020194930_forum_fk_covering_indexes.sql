create index if not exists forum_comments_author_id_idx
  on public.forum_comments (author_id);

create index if not exists forum_post_reactions_user_id_idx
  on public.forum_post_reactions (user_id);

create index if not exists forum_posts_author_id_idx
  on public.forum_posts (author_id);

create index if not exists forum_reports_comment_id_idx
  on public.forum_reports (comment_id);

create index if not exists forum_reports_post_id_idx
  on public.forum_reports (post_id);

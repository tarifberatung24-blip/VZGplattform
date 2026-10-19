"use client"

import { useActionState } from "react"
import { MessageCircle, Pin, ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  createForumComment,
  reportForumContent,
  toggleForumReaction,
  type ForumActionState,
} from "@/lib/forum/actions"
import { getForumCopy } from "@/lib/forum/copy"
import type { ForumComment, ForumPost } from "@/lib/forum/contract"
import type { Locale } from "@/lib/i18n/dictionaries"

export function ForumFeed({
  locale,
  posts,
  comments,
}: {
  locale: Locale
  posts: readonly ForumPost[]
  comments: readonly ForumComment[]
}) {
  const copy = getForumCopy(locale)
  const commentsByPost = new Map<string, ForumComment[]>()
  for (const comment of comments) {
    const current = commentsByPost.get(comment.postId) ?? []
    current.push(comment)
    commentsByPost.set(comment.postId, current)
  }

  return (
    <section aria-labelledby="forum-feed" className="space-y-4">
      <h2 id="forum-feed" className="text-base font-bold">{copy.feedTitle}</h2>
      {posts.length === 0 ? <p className="paper paper-empty px-4 py-8 text-center text-sm text-muted-foreground">{copy.empty}</p> : null}
      {posts.map((post) => (
        <article key={post.id} className="paper p-4 sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className={post.authorType === "official" ? "text-primary" : "text-muted-foreground"}>
                  {post.authorType === "official" ? copy.official : copy.member}
                </span>
                {post.isPinned ? <span className="inline-flex items-center gap-1 text-primary"><Pin className="size-3" />{copy.pinned}</span> : null}
              </div>
              <h3 className="mt-1 text-base font-bold">{post.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.createdAt, locale)}</p>
            </div>
            {post.authorType === "official" && post.officialTopic ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{copy.topic[post.officialTopic]}</span>
            ) : null}
          </header>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.body}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <form action={toggleForumReaction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="postId" value={post.id} />
              <Button type="submit" size="sm" variant={post.reacted ? "secondary" : "ghost"}>
                <ThumbsUp className="size-4" /> {post.reacted ? copy.reacted : copy.useful} {post.helpfulCount > 0 ? `(${post.helpfulCount})` : ""}
              </Button>
            </form>
            <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground"><MessageCircle className="size-4" /> {post.commentCount} {copy.comment}</span>
            {post.isLocked ? <span className="text-xs text-muted-foreground">{copy.locked}</span> : null}
            <ReportForm locale={locale} targetType="post" targetId={post.id} />
          </div>

          <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
            {(commentsByPost.get(post.id) ?? []).map((comment) => (
              <div key={comment.id} className="text-sm">
                <p className="whitespace-pre-wrap leading-6">{comment.body}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{copy.member} · {formatDate(comment.createdAt, locale)}</span>
                  <ReportForm locale={locale} targetType="comment" targetId={comment.id} />
                </div>
              </div>
            ))}
          </div>

          {!post.isLocked ? (
            <form action={createForumComment} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="postId" value={post.id} />
              <label className="sr-only" htmlFor={`comment-${post.id}`}>{copy.reply}</label>
              <input id={`comment-${post.id}`} name="body" required minLength={1} maxLength={4000} placeholder={copy.reply} className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-background px-3 text-sm" />
              <Button type="submit" variant="outline">{copy.send}</Button>
            </form>
          ) : null}
        </article>
      ))}
    </section>
  )
}

function ReportForm({
  locale,
  targetType,
  targetId,
}: {
  locale: Locale
  targetType: "post" | "comment"
  targetId: string
}) {
  const copy = getForumCopy(locale)
  const [state, action, pending] = useActionState(reportForumContent, initialForumActionState)
  const message = state.message === "REPORTED" ? copy.reportSent : state.message ? copy.actionFailed : null
  return (
    <details className="ml-auto text-xs text-muted-foreground">
      <summary className="cursor-pointer hover:text-foreground">{copy.report}</summary>
      <form action={action} className="mt-2 w-64 rounded-sm border border-border bg-background p-3 shadow-sm">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <label className="block text-xs font-medium">
          {copy.reportReason}
          <textarea name="reason" required minLength={3} maxLength={500} rows={3} className="mt-1.5 w-full resize-y rounded-sm border border-border bg-background p-2 text-sm" />
        </label>
        <p className="mt-2 text-[11px] leading-4">{copy.reportHint}</p>
        {message ? <p aria-live="polite" className={`mt-2 text-xs ${state.ok ? "text-primary" : "text-destructive"}`}>{message}</p> : null}
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="mt-2">{copy.report}</Button>
      </form>
    </details>
  )
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "bg-BG", { dateStyle: "medium" }).format(new Date(value))
}

const initialForumActionState: ForumActionState = { message: null, ok: false }

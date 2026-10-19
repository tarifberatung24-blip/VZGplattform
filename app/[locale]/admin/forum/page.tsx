import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { WorkspacePage, WorkspacePageHeader } from "@/components/layout/workspace-page-header"
import { getAdmin } from "@/lib/admin/access"
import { moderateForumPost } from "@/lib/forum/actions"
import { getForumCopy } from "@/lib/forum/copy"
import { isLocale } from "@/lib/i18n/dictionaries"
import { createJourneyDb } from "@/lib/journey/db"

export const dynamic = "force-dynamic"

type AdminPost = { id: string; title: string; status: "published" | "hidden"; is_locked: boolean; created_at: string }
type AdminReport = { id: string; post_id: string | null; comment_id: string | null; reason: string; status: string; created_at: string }

export default async function ForumModerationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : "bg"
  const [admin, db] = await Promise.all([getAdmin(), Promise.resolve(createJourneyDb())])
  if (!admin || !db) notFound()

  const [{ data: posts }, { data: reports }] = await Promise.all([
    db.from("forum_posts").select("id,title,status,is_locked,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("forum_reports").select("id,post_id,comment_id,reason,status,created_at").eq("status", "open").order("created_at", { ascending: true }).limit(100),
  ])
  const postRows = (posts ?? []) as AdminPost[]
  const postTitle = new Map(postRows.map((post) => [post.id, post.title]))
  const copy = getForumCopy(locale)

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-4xl">
        <WorkspacePageHeader eyebrow={copy.eyebrow} title={copy.forumAdministration} action={<Link href={`/${locale}/forum`} className="text-sm font-medium text-primary hover:underline">Forum</Link>} />
        <section className="mt-8" aria-labelledby="open-reports">
          <h2 id="open-reports" className="text-base font-bold">{copy.report}</h2>
          <div className="mt-3 space-y-3">
            {(reports ?? []).length === 0 ? <p className="paper paper-empty px-4 py-6 text-sm text-muted-foreground">—</p> : null}
            {((reports ?? []) as AdminReport[]).map((report) => (
              <article key={report.id} className="paper p-4 text-sm">
                <p className="font-medium">{report.post_id ? postTitle.get(report.post_id) ?? report.post_id : report.comment_id}</p>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{report.reason}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-10" aria-labelledby="forum-posts">
          <h2 id="forum-posts" className="text-base font-bold">{copy.feedTitle}</h2>
          <div className="mt-3 space-y-3">
            {postRows.map((post) => (
              <article key={post.id} className="paper flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium">{post.title}</p><p className="mt-1 text-xs text-muted-foreground">{post.status} · {post.is_locked ? copy.locked : ""}</p></div>
                <div className="flex flex-wrap gap-2">
                  <form action={moderateForumPost}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="status" value={post.status === "published" ? "hidden" : "published"} /><input type="hidden" name="locked" value={String(post.is_locked)} /><Button type="submit" variant="outline" size="sm">{post.status === "published" ? copy.hide : copy.show}</Button></form>
                  <form action={moderateForumPost}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="status" value={post.status} /><input type="hidden" name="locked" value={String(!post.is_locked)} /><Button type="submit" variant="outline" size="sm">{post.is_locked ? copy.open : copy.close}</Button></form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </WorkspacePage>
  )
}

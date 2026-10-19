import Link from "next/link"

import { ForumAnnouncementComposer } from "@/components/forum/forum-announcement-composer"
import { ForumComposer } from "@/components/forum/forum-composer"
import { ForumFeed } from "@/components/forum/forum-feed"
import { WorkspacePage, WorkspacePageHeader } from "@/components/layout/workspace-page-header"
import { getAdmin } from "@/lib/admin/access"
import { getForumCopy } from "@/lib/forum/copy"
import { loadForum } from "@/lib/forum/data"
import { isLocale } from "@/lib/i18n/dictionaries"

export const dynamic = "force-dynamic"

export default async function ForumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : "bg"
  const [forum, admin] = await Promise.all([loadForum(), getAdmin()])
  const copy = getForumCopy(locale)

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-5xl">
        <WorkspacePageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} />
        <p className="paper paper-note mt-6 px-4 py-3 text-sm leading-6 text-muted-foreground">{copy.rules}</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ForumFeed locale={locale} posts={forum.posts} comments={forum.comments} />
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <ForumComposer locale={locale} />
            {admin ? (
              <>
                <ForumAnnouncementComposer locale={locale} />
                <Link href={`/${locale}/admin/forum`} className="block text-center text-xs font-medium text-primary hover:underline">{copy.forumAdministration}</Link>
              </>
            ) : null}
          </aside>
        </div>
      </div>
    </WorkspacePage>
  )
}

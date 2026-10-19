"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { createForumAnnouncement, initialForumActionState } from "@/lib/forum/actions"
import { forumOfficialTopics } from "@/lib/forum/contract"
import { getForumCopy } from "@/lib/forum/copy"
import type { Locale } from "@/lib/i18n/dictionaries"

export function ForumAnnouncementComposer({ locale }: { locale: Locale }) {
  const copy = getForumCopy(locale)
  const [state, action, pending] = useActionState(createForumAnnouncement, initialForumActionState)
  const message = state.message === "POSTED" ? copy.published : state.message ? copy.postFailed : null

  return (
    <form action={action} className="paper space-y-4 border-primary/20 bg-primary/[0.02] p-4 sm:p-5">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="text-base font-bold">{copy.announcementTitle}</h2>
      <label className="block text-sm font-medium">
        {copy.announcementTopic}
        <select name="topic" className="mt-1.5 h-10 w-full rounded-sm border border-border bg-background px-3 text-sm" defaultValue="platform">
          {forumOfficialTopics.map((topic) => <option key={topic} value={topic}>{copy.topic[topic]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">
        {copy.postTitle}
        <input name="title" required minLength={3} maxLength={140} className="mt-1.5 h-10 w-full rounded-sm border border-border bg-background px-3 text-sm" />
      </label>
      <label className="block text-sm font-medium">
        {copy.postBody}
        <textarea name="body" required minLength={1} maxLength={5000} rows={5} className="mt-1.5 w-full resize-y rounded-sm border border-border bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" /> {copy.pinned}</label>
      {message ? <p aria-live="polite" className={`text-sm ${state.ok ? "text-primary" : "text-destructive"}`}>{message}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? copy.publishing : copy.publishAnnouncement}</Button>
    </form>
  )
}

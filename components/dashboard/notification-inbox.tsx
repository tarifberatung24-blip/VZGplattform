"use client"

import Link from "next/link"
import { useState } from "react"
import { BarChart3, Bell, CalendarClock, Mail, MailX, Sparkles, Trophy } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { BrandText } from "@/components/brand/horizon-wordmark"
import { inboxCopy, renderNotification } from "@/lib/notifications/copy"
import type { NotificationKind } from "@/lib/notifications/rules"

export type InboxNotification = {
  id: string
  kind: NotificationKind
  payload: Record<string, unknown> | null
  created_at: string
  read_at: string | null
}

const icons: Record<NotificationKind, typeof Bell> = {
  first_win: Trophy,
  report_day14: BarChart3,
  report_monthly: BarChart3,
  inactive_nudge: Sparkles,
  deadline_30: CalendarClock,
  deadline_7: CalendarClock,
}

const PREVIEW = 3

/**
 * "Пощенска кутия" in MyHorizon: reports, the first-win confirmation, a nudge
 * for inactive accounts and reminders before cancellation deadlines. Rows come
 * from the server; here the user reads them, marks them as read and decides
 * whether the same messages also arrive by e-mail.
 */
export function NotificationInbox({ initial, emailEnabled: initialEmail }: { initial: InboxNotification[]; emailEnabled: boolean }) {
  const { locale } = useLanguage()
  const copy = inboxCopy[locale]
  const [items, setItems] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(initialEmail)
  const [busy, setBusy] = useState(false)

  const unread = items.filter((item) => !item.read_at).length
  const shown = expanded ? items : items.slice(0, PREVIEW)

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    return response.ok
  }

  async function markRead(id?: string) {
    const stamp = new Date().toISOString()
    setItems((current) => current.map((item) => (!id || item.id === id) && !item.read_at ? { ...item, read_at: stamp } : item))
    await patch(id ? { action: "read", id } : { action: "read" })
  }

  async function toggleEmail() {
    setBusy(true)
    const next = !emailEnabled
    if (await patch({ action: "email", enabled: next })) setEmailEnabled(next)
    setBusy(false)
  }

  const dateFormat = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })

  return <section id="notifications" className="mt-6 rounded-md border border-border bg-card p-5" aria-labelledby="inbox-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="relative grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 ? <span className="absolute -right-1 -top-1 size-3 rounded-full bg-destructive ring-2 ring-card" aria-hidden="true" /> : null}
        </span>
        <div>
          <h2 id="inbox-title" className="text-lg font-semibold tracking-tight">{copy.title}</h2>
          {unread > 0 ? <p className="text-xs font-medium text-primary">{copy.unread(unread)}</p> : null}
        </div>
      </div>
      {unread > 0 ? <button type="button" onClick={() => markRead()} className="text-sm font-medium text-primary underline-offset-4 hover:underline">{copy.markAll}</button> : null}
    </div>

    {items.length === 0
      ? <p className="mt-4 text-sm text-muted-foreground"><BrandText text={copy.empty} /></p>
      : <ul className="mt-4 divide-y divide-border">
        {shown.map((item) => {
          const Icon = icons[item.kind] ?? Bell
          const rendered = renderNotification(item.kind, item.payload ?? {}, locale)
          const isUnread = !item.read_at
          return <li key={item.id} className={`flex gap-3 py-4 ${isUnread ? "" : "opacity-75"}`}>
            <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-md ${isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={`text-sm ${isUnread ? "font-semibold" : "font-medium"}`}><BrandText text={rendered.title} /></p>
                <time className="text-xs text-muted-foreground" dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time>
              </div>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {rendered.body.split("\n").map((line) => <p key={line}><BrandText text={line} /></p>)}
              </div>
              <Link href={rendered.href} onClick={() => isUnread && markRead(item.id)} className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">{rendered.cta}</Link>
            </div>
          </li>
        })}
      </ul>}

    {items.length > PREVIEW
      ? <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline">{expanded ? copy.showLess : copy.showAll(items.length)}</button>
      : null}

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {emailEnabled ? <Mail className="size-4" aria-hidden="true" /> : <MailX className="size-4" aria-hidden="true" />}
        {emailEnabled ? copy.emailOn : copy.emailOff}
      </span>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={emailEnabled} disabled={busy} onChange={toggleEmail} />
        {copy.emailLabel}
      </label>
    </div>
  </section>
}

"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { BarChart3, Bell, CalendarClock, ChevronDown, Mail, MailX, Sparkles, Trophy } from "lucide-react"

import { BrandText } from "@/components/brand/horizon-wordmark"
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useLanguage } from "@/lib/i18n/language-context"
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
  report_monthly: BarChart3,
  inactive_nudge: Sparkles,
  deadline_30: CalendarClock,
  deadline_7: CalendarClock,
}

type InboxResponse = {
  items?: InboxNotification[]
  emailEnabled?: boolean
}

/** Compact workspace mailbox. Messages stay collapsed until the user asks to read one. */
export function NotificationMailbox() {
  const { locale } = useLanguage()
  const copy = inboxCopy[locale]
  const de = locale === "de"
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<InboxNotification[]>([])
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" })
      if (!response.ok) throw new Error("mailbox")
      const data = (await response.json()) as InboxResponse
      setItems(Array.isArray(data.items) ? data.items : [])
      setEmailEnabled(data.emailEnabled !== false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return response.ok
  }

  async function markRead(id?: string) {
    const previous = items
    const stamp = new Date().toISOString()
    setItems((current) => current.map((item) => (!id || item.id === id) && !item.read_at ? { ...item, read_at: stamp } : item))
    if (!(await patch(id ? { action: "read", id } : { action: "read" }))) setItems(previous)
  }

  async function toggleEmail() {
    setBusy(true)
    const next = !emailEnabled
    if (await patch({ action: "email", enabled: next })) setEmailEnabled(next)
    setBusy(false)
  }

  const unread = items.filter((item) => !item.read_at).length
  const dateFormat = new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip={copy.title}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Bell aria-hidden="true" />
          <span>{copy.title}</span>
        </SidebarMenuButton>
        {unread > 0 ? (
          <SidebarMenuBadge className="rounded-full bg-destructive text-destructive-foreground group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:text-[9px]">
            {unread > 99 ? "99+" : unread}
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full gap-0 p-0 sm:!max-w-md" aria-describedby={undefined}>
          <SheetHeader className="border-b border-border pr-14">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="size-5 text-primary" aria-hidden="true" />
              {copy.title}
              {unread > 0 ? <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{unread}</span> : null}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {unread > 0 ? (
              <button type="button" onClick={() => void markRead()} className="mb-2 min-h-10 text-sm font-medium text-primary underline-offset-4 hover:underline">
                {copy.markAll}
              </button>
            ) : null}

            {loading ? <p className="py-8 text-sm text-muted-foreground">{de ? "Nachrichten werden geladen…" : "Съобщенията се зареждат…"}</p> : null}
            {failed ? (
              <div className="py-8 text-sm text-muted-foreground">
                <p>{de ? "Das Postfach konnte nicht geladen werden." : "Пощенската кутия не можа да се зареди."}</p>
                <button type="button" onClick={() => void load()} className="mt-3 font-semibold text-primary underline-offset-4 hover:underline">
                  {de ? "Erneut versuchen" : "Опитай отново"}
                </button>
              </div>
            ) : null}
            {!loading && !failed && items.length === 0 ? <p className="py-8 text-sm text-muted-foreground"><BrandText text={copy.empty} /></p> : null}

            {!loading && !failed && items.length > 0 ? (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const Icon = icons[item.kind] ?? Bell
                  const rendered = renderNotification(item.kind, item.payload ?? {}, locale)
                  const isUnread = !item.read_at
                  return (
                    <li key={item.id} className="py-1">
                      <details className="group" onToggle={(event) => {
                        if (event.currentTarget.open && isUnread) void markRead(item.id)
                      }}>
                        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-3 marker:hidden hover:bg-muted/50">
                          <span className={`relative grid size-9 shrink-0 place-items-center rounded-full ${isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="size-4" aria-hidden="true" />
                            {isUnread ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-destructive ring-2 ring-popover" aria-hidden="true" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm ${isUnread ? "font-bold" : "font-medium"}`}><BrandText text={rendered.title} /></span>
                            <time className="mt-0.5 block text-xs text-muted-foreground" dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time>
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="pb-4 pl-14 pr-2">
                          <div className="space-y-1 text-sm leading-6 text-muted-foreground">
                            {rendered.body.split("\n").map((line) => <p key={line}><BrandText text={line} /></p>)}
                          </div>
                          <Link href={rendered.href} onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                            {rendered.cta}
                          </Link>
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>

          <div className="border-t border-border p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              {emailEnabled ? <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" /> : <MailX className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="flex-1">{copy.emailLabel}</span>
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={emailEnabled} disabled={busy} onChange={() => void toggleEmail()} />
            </label>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

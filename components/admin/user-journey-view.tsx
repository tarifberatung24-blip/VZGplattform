import Link from "next/link"
import { ChevronLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AdminUserRow, JourneyEvent } from "@/lib/admin/journey-summary"
import { ADMIN_COPY, FLAG_TONE, flagLabel, formatDateTime, formatDay, formatTime, placeLabel, type AdminLocale } from "./labels"

function groupByDay(events: JourneyEvent[], locale: AdminLocale): Array<{ day: string; items: JourneyEvent[] }> {
  const groups: Array<{ day: string; items: JourneyEvent[] }> = []
  for (const event of events) {
    const day = formatDay(event.created_at, locale) ?? "?"
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(event)
    else groups.push({ day, items: [event] })
  }
  return groups
}

/** One user's facts and step-by-step timeline, with a direct way to write to them. */
export function AdminUserJourneyView({ locale, row, events }: { locale: AdminLocale; row: AdminUserRow; events: JourneyEvent[] }) {
  const copy = ADMIN_COPY[locale]
  const facts = [
    { label: copy.registered, value: formatDateTime(row.createdAt, locale) ?? copy.never },
    { label: copy.lastSignIn, value: formatDateTime(row.lastSignInAt, locale) ?? copy.never },
    { label: copy.onboarding, value: row.onboardingStep === "completed" ? copy.onboardingDone : (row.onboardingStep ?? copy.onboardingNone) },
    { label: copy.terms, value: row.termsAccepted ? copy.termsYes : copy.termsNo },
    { label: copy.recording, value: row.recordingOff ? copy.off : copy.on },
  ]
  const days = groupByDay(events, locale)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link href={`/${locale}/admin/users`} className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary"><ChevronLeft className="size-4" aria-hidden="true" />{copy.back}</Link>
      <header className="mt-3 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{row.name ?? row.email ?? row.id}</h1>
          {row.email ? <p className="truncate text-sm text-muted-foreground">{row.email}</p> : null}
        </div>
        {row.email ? <Button asChild className="h-11"><a href={`mailto:${row.email}`}><Mail className="mr-2 size-4" aria-hidden="true" />{copy.write}</a></Button> : null}
      </header>

      {row.flags.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {row.flags.map((flag) => <span key={flag} className={`rounded-full px-2.5 py-1 text-xs font-medium ${FLAG_TONE[flag]}`}>{flagLabel(flag, row, locale)}</span>)}
        </div>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {row.modules.length ? (
        <section className="mt-6" aria-labelledby="modules-title">
          <h2 id="modules-title" className="text-sm font-semibold">{copy.modules}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.modules.map((module) => <span key={module} className="rounded-full border border-border px-2.5 py-1 text-xs">{placeLabel(module, null, locale)}</span>)}
          </div>
        </section>
      ) : null}

      <section className="mt-6" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-sm font-semibold">{copy.timeline}</h2>
        <p className="text-xs text-muted-foreground">{copy.timelineNote}</p>
        {days.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{row.recordingOff ? copy.recordingOff : copy.noEvents}</p> : days.map((group) => (
          <div key={group.day} className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.day}</h3>
            <ol className="mt-1.5 space-y-0.5">
              {group.items.map((event, index) => (
                <li key={`${event.created_at}-${index}`} className="flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm odd:bg-muted/30">
                  <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{formatTime(event.created_at, locale)}</span>
                  <span className={`shrink-0 ${event.event === "client_error" ? "font-medium text-destructive" : "text-muted-foreground"}`}>{event.event === "client_error" ? copy.error(event.code) : copy.opened}</span>
                  <span className="min-w-0 truncate">{placeLabel(event.module, event.step, locale)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </div>
  )
}

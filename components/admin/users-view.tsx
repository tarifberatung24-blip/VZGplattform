import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { AdminUserRow } from "@/lib/admin/journey-summary"
import { ADMIN_COPY, FLAG_TONE, flagLabel, formatDateTime, placeLabel, type AdminLocale } from "./labels"

function lastLine(row: AdminUserRow, locale: AdminLocale): string {
  const copy = ADMIN_COPY[locale]
  if (row.recordingOff) return copy.recordingOff
  if (!row.lastActivity || !row.lastPlace) return copy.noActivity
  return `${copy.last}: ${formatDateTime(row.lastActivity, locale)}, ${placeLabel(row.lastPlace.module, row.lastPlace.step, locale)}`
}

/** The admin list: people who need help first, one card per user, readable on a phone. */
export function AdminUsersView({ locale, rows, error }: { locale: AdminLocale; rows: AdminUserRow[]; error: string | null }) {
  const copy = ADMIN_COPY[locale]
  const needHelp = rows.filter((row) => row.flags.length > 0).length
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        <p className="mt-2 text-sm font-medium">{copy.stats(rows.length, needHelp)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.privacy}</p>
      </header>
      {error ? <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{`${copy.partial} ${error}`}</p> : null}
      {rows.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{copy.empty}</p> : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/${locale}/admin/users/${row.id}`} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{row.name ?? row.email ?? row.id}</p>
                    {row.name && row.email ? <p className="truncate text-xs text-muted-foreground">{row.email}</p> : null}
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
                {row.flags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.flags.map((flag) => <span key={flag} className={`rounded-full px-2.5 py-1 text-xs font-medium ${FLAG_TONE[flag]}`}>{flagLabel(flag, row, locale)}</span>)}
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">{lastLine(row, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

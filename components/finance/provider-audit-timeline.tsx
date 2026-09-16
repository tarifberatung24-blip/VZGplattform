"use client"

import { Fragment } from "react"
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2 } from "lucide-react"
import { providerAuditLabels, providerLifecycleLabels, type ProviderAuditEvent, type ProviderLifecycleStatus } from "@/lib/provider-audit"

export function ProviderAuditTimeline({
  events = [],
  currentStatus,
  providerName = "ELSTER",
}: {
  events?: ProviderAuditEvent[]
  currentStatus?: ProviderLifecycleStatus
  providerName?: string
}) {
  const statusIcons: Record<string, React.ReactNode> = {
    created: <Clock className="size-4 text-primary" />,
    validated: <CheckCircle2 className="size-4 text-emerald-600" />,
    review_required: <AlertCircle className="size-4 text-amber-600" />,
    ready_for_provider: <CheckCircle2 className="size-4 text-emerald-600" />,
    queued: <Loader2 className="size-4 animate-spin text-primary" />,
    transmitting: <Loader2 className="size-4 animate-spin text-primary" />,
    accepted: <CheckCircle2 className="size-4 text-emerald-600" />,
    rejected: <XCircle className="size-4 text-red-600" />,
    failed: <XCircle className="size-4 text-red-600" />,
    cancelled: <AlertCircle className="size-4 text-amber-600" />,
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Няма история на подадени заявки към {providerName}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Статус на подаването</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              {currentStatus ? providerLifecycleLabels[currentStatus] : "Нямаше подадени"}
            </h3>
          </div>
        </div>

        <div className="space-y-4">
          {events.map((event, index) => (
            <Fragment key={event.id}>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                    {statusIcons[event.event_type] || <Clock className="size-4 text-muted-foreground" />}
                  </div>
                  {index < events.length - 1 && <div className="w-0.5 h-8 bg-border my-2" />}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-sm text-foreground">
                    {providerAuditLabels[event.event_type] || event.event_type}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.created_at).toLocaleString("bg-BG", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  {Object.keys(event.redacted_metadata || {}).length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                      {Object.entries(event.redacted_metadata).map(([key, value]) => (
                        <div key={key}>
                          {key}: {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

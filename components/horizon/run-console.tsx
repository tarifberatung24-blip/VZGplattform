"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Check,
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { runConsoleCopy, type RunConsoleCopy } from "@/lib/horizon/agent-runs/ui-copy"
import { AGENT_RUN_STATUSES, type AgentRunStatus } from "@/lib/horizon/agent-runs/contract"

type Locale = "bg" | "de"
type LoadState = "loading" | "ready" | "error" | "schema"

type RunReference = { kind: string; id: string }
type Run = {
  id: string
  caseId: string | null
  serviceRequestId: string | null
  traceId: string
  status: AgentRunStatus
  objective: string
  leadAgent: string
  skillVersion: string | null
  promptVersion: string | null
  modelVersion: string | null
  inputReferences: RunReference[]
  outputReferences: RunReference[]
  errorCode: string | null
  errorMessageSafe: string | null
  attempt: number
  maxAttempts: number
  createdAt: string
  completedAt: string | null
}
type RunStep = {
  id: string
  stepKey: string
  agentId: string
  status: string
  attempt: number
  errorCode: string | null
  errorMessageSafe: string | null
  startedAt: string | null
  completedAt: string | null
}
type RunEvent = {
  id: string
  eventType: string
  status: string
  attempt: number
  createdAt: string
  lastErrorCode: string | null
}
type RunDetail = { run: Run; steps: RunStep[]; events: RunEvent[] }
type Summary = { byStatus: Record<string, number>; total: number; retrying: number; blocked: number } | null

function isSchemaError(status: number, code?: string) {
  return status === 503 || code === "ENGINE_MIGRATION_NOT_APPLIED" || code === "RUN_LIST_UNAVAILABLE"
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "completed") return "success"
  if (status === "failed" || status === "dead_letter") return "danger"
  if (status === "awaiting_approval" || status === "paused") return "warning"
  if (status === "running") return "info"
  return "neutral"
}

export function RunConsole() {
  const { locale } = useLanguage()
  const currentLocale: Locale = locale === "de" ? "de" : "bg"
  const copy: RunConsoleCopy = runConsoleCopy[currentLocale]

  const [state, setState] = useState<LoadState>("loading")
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [summary, setSummary] = useState<Summary>(null)
  const [filter, setFilter] = useState<AgentRunStatus | "all">("all")
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const statusLabel = (status: string): string =>
    ({
      queued: copy.statusQueued,
      running: copy.statusRunning,
      paused: copy.statusPaused,
      awaiting_approval: copy.statusAwaitingApproval,
      completed: copy.statusCompleted,
      failed: copy.statusFailed,
      cancelled: copy.statusCancelled,
      dead_letter: copy.statusDeadLetter,
      pending: copy.stepPending,
      skipped: copy.stepSkipped,
      received: copy.eventReceived,
      processing: copy.eventProcessing,
      processed: copy.eventProcessed,
    } as Record<string, string>)[status] ?? status

  const request = useCallback(async <T,>(url: string, options?: RequestInit): Promise<T | null> => {
    const response = await fetch(url, { credentials: "same-origin", ...options })
    const body = (await response.json().catch(() => ({}))) as { code?: string } & T
    if (!response.ok) {
      if (isSchemaError(response.status, body.code)) throw new Error("SCHEMA")
      throw new Error(body.code ?? "REQUEST_FAILED")
    }
    return body
  }, [])

  const load = useCallback(async () => {
    setState("loading")
    setError(null)
    try {
      const query = filter === "all" ? "" : `?status=${filter}`
      const data = await request<{ runs: Run[]; summary: Summary }>(`/api/horizon/agent-runs${query}`)
      setRuns(data?.runs ?? [])
      setSummary(data?.summary ?? null)
      setState("ready")
    } catch (cause) {
      setState(cause instanceof Error && cause.message === "SCHEMA" ? "schema" : "error")
      setError(cause instanceof Error ? cause.message : "REQUEST_FAILED")
    }
  }, [request, filter])

  useEffect(() => {
    void load()
  }, [load])

  const openDetail = useCallback(async (runId: string) => {
    if (detailId === runId) {
      setDetailId(null)
      setDetail(null)
      return
    }
    setDetailId(runId)
    setDetail(null)
    try {
      const data = await request<RunDetail>(`/api/horizon/agent-runs/${runId}`)
      if (data) setDetail(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "REQUEST_FAILED")
    }
  }, [request, detailId])

  const act = useCallback(async (runId: string, action: "cancel" | "retry" | "approve" | "reject") => {
    setBusy(runId)
    setNotice(null)
    try {
      if (action === "approve" || action === "reject") {
        await request(`/api/horizon/agent-runs/${runId}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: action }),
        })
        setNotice(action === "approve" ? copy.approved : copy.rejected)
      } else {
        await request(`/api/horizon/agent-runs/${runId}/${action}`, { method: "POST" })
        setNotice(action === "cancel" ? copy.cancelled : copy.retried)
      }
      await load()
      if (detailId === runId) {
        const refreshed = await request<RunDetail>(`/api/horizon/agent-runs/${runId}`)
        if (refreshed) setDetail(refreshed)
      }
    } catch {
      setError(copy.actionFailed)
    } finally {
      setBusy(null)
    }
  }, [request, load, detailId, copy])

  const metrics: Array<{ label: string; value: number }> = [
    { label: copy.metricTotal, value: summary?.total ?? runs.length },
    { label: copy.metricRunning, value: summary?.byStatus.running ?? 0 },
    { label: copy.metricAwaiting, value: summary?.byStatus.awaiting_approval ?? 0 },
    { label: copy.metricRetrying, value: summary?.retrying ?? 0 },
    { label: copy.metricBlocked, value: summary?.blocked ?? 0 },
    { label: copy.metricCompleted, value: summary?.byStatus.completed ?? 0 },
  ]

  const filterOptions: Array<AgentRunStatus | "all"> = ["all", ...AGENT_RUN_STATUSES]

  return (
    <main className="min-h-[calc(100svh-4rem)] bg-background px-4 pb-24 pt-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-col justify-between gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{copy.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.intro}</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={state === "loading"}>
            <RefreshCw className={`mr-2 size-4 ${state === "loading" ? "animate-spin" : ""}`} />
            {copy.refresh}
          </Button>
        </header>

        {state === "schema" ? (
          <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-900 dark:text-amber-100">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p>{copy.schema}</p>
          </div>
        ) : null}
        {state === "error" ? (
          <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <p>{copy.error} <span className="font-mono text-xs">{error}</span></p>
          </div>
        ) : null}
        {notice ? <div role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-border/80 bg-card p-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p>
            </div>
          ))}
        </div>

        <nav aria-label={copy.filter} className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-muted/30 p-1">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-current={filter === option ? "page" : undefined}
              className={`flex min-h-9 shrink-0 items-center rounded-xl px-3 text-xs font-medium transition-colors ${filter === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {option === "all" ? copy.filterAll : statusLabel(option)}
            </button>
          ))}
        </nav>

        {state === "loading" ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : null}

        {state === "ready" ? (
          <div className="mt-6 space-y-3">
            {runs.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                <BarChart3 className="size-5 shrink-0" />
                {copy.empty}
              </div>
            ) : (
              runs.map((run) => (
                <article key={run.id} className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_8px_30px_-24px_hsl(var(--foreground)/.35)] sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold">{run.objective}</h2>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass(statusTone(run.status))}`}>
                          {statusLabel(run.status)}
                        </span>
                        {run.skillVersion ? <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">{run.skillVersion}</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.leadAgent}: {run.leadAgent} · {copy.created}: {new Date(run.createdAt).toLocaleString(currentLocale)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {copy.attempt}: {run.attempt}/{run.maxAttempts}
                        {run.caseId ? ` · ${copy.caseRef}: ${run.caseId.slice(0, 8)}` : ""}
                        {run.serviceRequestId ? ` · ${copy.serviceRequestRef}: ${run.serviceRequestId.slice(0, 8)}` : ""}
                      </p>
                      {run.errorMessageSafe ? <p className="mt-2 text-xs text-destructive">{run.errorMessageSafe}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void openDetail(run.id)}>
                        {detailId === run.id ? copy.close : copy.details}
                      </Button>
                      {run.status === "awaiting_approval" || run.status === "paused" ? (
                        <>
                          <Button size="sm" disabled={busy === run.id} onClick={() => void act(run.id, "approve")}>
                            {busy === run.id ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Check className="mr-1 size-3" />}
                            {copy.approve}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy === run.id} onClick={() => void act(run.id, "reject")}>
                            {copy.reject}
                          </Button>
                        </>
                      ) : null}
                      {run.status === "failed" ? (
                        <Button size="sm" variant="outline" disabled={busy === run.id} onClick={() => void act(run.id, "retry")}>
                          {busy === run.id ? <Loader2 className="mr-1 size-3 animate-spin" /> : <RotateCcw className="mr-1 size-3" />}
                          {copy.retry}
                        </Button>
                      ) : null}
                      {["queued", "running", "paused", "awaiting_approval", "failed"].includes(run.status) ? (
                        <Button size="sm" variant="ghost" disabled={busy === run.id} onClick={() => void act(run.id, "cancel")}>
                          <X className="mr-1 size-3" />
                          {copy.cancel}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {detailId === run.id && detail ? <RunDetailBody detail={detail} copy={copy} locale={currentLocale} statusLabel={statusLabel} /> : null}
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>
    </main>
  )
}

function toneClass(tone: "neutral" | "success" | "warning" | "danger" | "info") {
  return {
    neutral: "border-border bg-muted/40 text-muted-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-primary/30 bg-primary/10 text-primary",
  }[tone]
}

function ReferenceList({ title, references, copy }: { title: string; references: RunReference[]; copy: RunConsoleCopy }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {references.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{copy.noReferences}</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1">
          {references.map((reference) => (
            <span key={`${reference.kind}:${reference.id}`} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {reference.kind}:{reference.id.slice(0, 8)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RunDetailBody({
  detail,
  copy,
  locale,
  statusLabel,
}: {
  detail: RunDetail
  copy: RunConsoleCopy
  locale: Locale
  statusLabel: (status: string) => string
}) {
  const { run, steps, events } = detail
  const approvalRequired = run.status === "awaiting_approval" || run.status === "paused"
  const hasOutcome = run.outputReferences.length > 0

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>{copy.traceId}: <span className="font-mono">{run.traceId}</span></p>
        <p>{copy.skillVersion}: {run.skillVersion ?? "—"}</p>
        <p>{copy.promptVersion}: {run.promptVersion ?? "—"}</p>
        <p>{copy.modelVersion}: {run.modelVersion ?? "—"}</p>
        <p>{copy.completed}: {run.completedAt ? new Date(run.completedAt).toLocaleString(locale) : "—"}</p>
      </div>

      <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.safetyDecision}</h4>
          <p className="mt-1 flex items-center gap-2 text-xs">
            <ShieldCheck className="size-4 text-primary" />
            {approvalRequired ? copy.approvalRequired : copy.approvalNone}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.actionOutcome}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{hasOutcome ? copy.references : copy.actionNone}</p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
        <ReferenceList title={copy.references} references={run.inputReferences} copy={copy} />
        <ReferenceList title={copy.actionOutcome} references={run.outputReferences} copy={copy} />
      </div>

      <div className="border-t border-border/60 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.steps}</h4>
        <div className="mt-2 space-y-2">
          {steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">{copy.noSteps}</p>
          ) : (
            steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-border/70 bg-card p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{step.stepKey}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClass(statusTone(step.status))}`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{copy.stepAgent}: {step.agentId} · {copy.attempt} {step.attempt}</p>
                {step.errorCode ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{copy.errorCode}: {step.errorCode}</p> : null}
                {step.errorMessageSafe ? <p className="mt-1 text-destructive">{step.errorMessageSafe}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-border/60 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.events}</h4>
        <div className="mt-2 space-y-1">
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">{copy.noEvents}</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono">{event.eventType}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="size-3" />
                  {statusLabel(event.status)} · {new Date(event.createdAt).toLocaleString(locale)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

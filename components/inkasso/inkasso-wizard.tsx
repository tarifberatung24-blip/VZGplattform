"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

/**
 * Inkasso-Check wizard.
 *
 * Five steps, each of which the user drives: upload, confirm the extracted
 * facts, see the assessment, generate the letters, approve them. The product
 * never sends anything, so the last step is an explicit human approval and the
 * submission guidance tells the user how to file it themselves.
 */

type Step = 0 | 1 | 2 | 3 | 4

interface Position {
  rule: string
  label: string
  basis: string
  assessment: string
  amount: number
  recommendation: string
}

interface Evaluation {
  risk: string
  deadline_status: string
  positions: Position[]
  reducible_total: number
  actions: string[]
  pack_version: string
  disclaimer: string
}

interface Draft {
  action: string
  title: string
  cost: number
  body: string
  approved?: boolean
}

interface CaseRecord {
  id: string
  locale: string
  case_type: string
  status: string
  parties: Record<string, string>
  claim: Record<string, number | string>
  dates: Record<string, string | null>
  evidence: Record<string, string | number | boolean>
  evaluation: Evaluation | null
  drafts: Draft[]
}

const emptyCase = (locale: string) => ({
  locale,
  caseType: "inkasso",
  parties: { creditor: "", court: "", case_no: "" },
  claim: { hauptforderung: 0, verfahrenskosten: 0, inkassokosten: 0, zinsen: 0, total: 0 },
  dates: { service_date: null as string | null },
  evidence: {
    parallel_billing: false,
    data_exchange_delay_admitted: false,
    consumption_kwh: 0,
    meter_no: "",
  } as Record<string, string | number | boolean>,
})

const money = (n: number) => `${Number(n || 0).toFixed(2)} €`

/**
 * Raw API codes are not user-facing text. Map the ones a person can act on to
 * something readable, and fall back to a generic line for the rest.
 */
function readableError(raw: string, locale: string): string {
  const code = raw.replace(/^Error:\s*/, "")
  const bg: Record<string, string> = {
    AUTH_REQUIRED: "Трябва да влезеш в профила си, за да използваш Inkasso-Check.",
    SUPABASE_NOT_CONFIGURED: "Услугата не е конфигурирана в тази среда. Опитай в продукция.",
    SCHEMA_MISSING: "Услугата още се настройва. Опитай по-късно.",
    NO_TEXT_TO_EXTRACT: "Няма текст за извличане — постави писмото.",
    EVALUATION_REQUIRED: "Първо потвърди фактите и пусни оценката.",
    INVALID_CASE: "Нещо в данните е невалидно.",
  }
  const de: Record<string, string> = {
    AUTH_REQUIRED: "Du musst angemeldet sein, um den Inkasso-Check zu nutzen.",
    SUPABASE_NOT_CONFIGURED: "Der Dienst ist in dieser Umgebung nicht konfiguriert.",
    SCHEMA_MISSING: "Der Dienst wird noch eingerichtet. Bitte später erneut versuchen.",
    NO_TEXT_TO_EXTRACT: "Kein Text zum Extrahieren — bitte das Schreiben einfügen.",
    EVALUATION_REQUIRED: "Bitte zuerst die Angaben bestätigen und bewerten.",
    INVALID_CASE: "Einige Angaben sind ungültig.",
  }
  const table = locale === "de" ? de : bg
  return table[code] ?? (locale === "de" ? "Etwas ist schiefgelaufen." : "Нещо се обърка.")
}

export function InkassoWizard() {
  const { t, locale } = useLanguage()
  const c = t.inkasso

  const [caseId, setCaseId] = useState<string | null>(null)
  const [record, setRecord] = useState<CaseRecord | null>(null)
  const [step, setStep] = useState<Step>(0)
  const [text, setText] = useState("")
  const [facts, setFacts] = useState(emptyCase(locale))
  const [needsReview, setNeedsReview] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [guidance, setGuidance] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [c.stepUpload, c.stepConfirm, c.stepResult, c.stepDrafts, c.stepReview]

  const createCase = useCallback(async () => {
    const res = await fetch("/api/inkasso/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, caseType: "inkasso" }),
    })
    if (!res.ok) throw new Error((await res.json()).code)
    const data = await res.json()
    setCaseId(data.case.id)
    setRecord(data.case)
    return data.case.id as string
  }, [locale])

  // The case is created when the user actually submits something, not on mount:
  // an empty visit should not hit the database, and a misconfigured backend
  // should not greet the user with an error before they have done anything.
  async function runExtract() {
    setBusy(true)
    setError(null)
    try {
      const id = caseId ?? (await createCase())
      const res = await fetch(`/api/inkasso/cases/${id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error((await res.json()).code)
      const data = await res.json()
      const pick = (group: string, key: string, fallback: string | number | null) =>
        data.extracted?.[group]?.[key]?.value ?? fallback
      setFacts({
        ...facts,
        parties: {
          creditor: String(pick("parties", "creditor", "")),
          court: String(pick("parties", "court", "")),
          case_no: String(pick("parties", "case_no", "")),
        },
        claim: {
          hauptforderung: Number(pick("claim", "hauptforderung", 0)),
          verfahrenskosten: Number(pick("claim", "verfahrenskosten", 0)),
          inkassokosten: Number(pick("claim", "inkassokosten", 0)),
          zinsen: Number(pick("claim", "zinsen", 0)),
          total: Number(pick("claim", "total", 0)),
        },
        dates: { service_date: (pick("dates", "service_date", null) as string | null) || null },
        evidence: {
          ...facts.evidence,
          consumption_kwh: Number(pick("evidence", "consumption_kwh", 0)),
          meter_no: String(pick("evidence", "meter_no", "")),
        },
      })
      setNeedsReview(data.needs_review ?? [])
      setStep(1)
    } catch (e) {
      setError(readableError(String(e), locale))
    } finally {
      setBusy(false)
    }
  }

  async function confirmFacts() {
    if (!caseId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/inkasso/cases/${caseId}/facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facts),
      })
      if (!res.ok) throw new Error((await res.json()).code)
      const evalRes = await fetch(`/api/inkasso/cases/${caseId}/evaluate`, { method: "POST" })
      if (!evalRes.ok) throw new Error((await evalRes.json()).code)
      const evaluated = await evalRes.json()
      setRecord((r) => (r ? { ...r, evaluation: evaluated.evaluation } : r))
      setStep(2)
    } catch (e) {
      setError(readableError(String(e), locale))
    } finally {
      setBusy(false)
    }
  }

  async function makeDrafts() {
    if (!caseId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/inkasso/cases/${caseId}/drafts`, { method: "POST" })
      if (!res.ok) throw new Error((await res.json()).code)
      const data = await res.json()
      setDrafts(data.drafts ?? [])
      setGuidance(data.guidance ?? [])
      setStep(3)
    } catch (e) {
      setError(readableError(String(e), locale))
    } finally {
      setBusy(false)
    }
  }

  async function approve(action: string) {
    if (!caseId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/inkasso/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).code)
      const data = await res.json()
      setDrafts(data.drafts ?? drafts)
      setStep(4)
    } catch (e) {
      setError(readableError(String(e), locale))
    } finally {
      setBusy(false)
    }
  }

  const evaluation = record?.evaluation ?? null

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-28 sm:px-10">
      <Link
        href={localizedPath("/functions", locale)}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {c.back}
      </Link>

      <h1 className="mt-6 font-display text-[clamp(1.6rem,3vw,2.4rem)] font-black tracking-[-0.03em]">
        {c.title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{c.subtitle}</p>

      <ol className="mt-8 flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              i === step
                ? "border-primary bg-primary text-primary-foreground"
                : i < step
                  ? "border-border text-foreground"
                  : "border-border/50 text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === 0 && (
        <section className="mt-8 flex flex-col gap-4">
          <label htmlFor="inkasso-text" className="text-sm font-semibold">
            {c.pasteLabel}
          </label>
          <textarea
            id="inkasso-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-border bg-background p-4 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">{c.pasteHint}</p>
          <button
            type="button"
            onClick={runExtract}
            disabled={busy || !text.trim()}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? c.extracting : c.extract}
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="mt-8 flex flex-col gap-5">
          {needsReview.length > 0 && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
              <p className="font-semibold">{c.needsReview}</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {needsReview.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.creditor} value={facts.parties.creditor}
              onChange={(v) => setFacts({ ...facts, parties: { ...facts.parties, creditor: v } })} />
            <Field label={c.court} value={facts.parties.court}
              onChange={(v) => setFacts({ ...facts, parties: { ...facts.parties, court: v } })} />
            <Field label={c.caseNo} value={facts.parties.case_no}
              onChange={(v) => setFacts({ ...facts, parties: { ...facts.parties, case_no: v } })} />
            <Field label={c.serviceDate} type="date" value={facts.dates.service_date ?? ""}
              onChange={(v) => setFacts({ ...facts, dates: { service_date: v || null } })} />
            <Field label={c.hauptforderung} type="number" value={String(facts.claim.hauptforderung)}
              onChange={(v) => setFacts({ ...facts, claim: { ...facts.claim, hauptforderung: Number(v) } })} />
            <Field label={c.verfahrenskosten} type="number" value={String(facts.claim.verfahrenskosten)}
              onChange={(v) => setFacts({ ...facts, claim: { ...facts.claim, verfahrenskosten: Number(v) } })} />
            <Field label={c.inkassokosten} type="number" value={String(facts.claim.inkassokosten)}
              onChange={(v) => setFacts({ ...facts, claim: { ...facts.claim, inkassokosten: Number(v) } })} />
            <Field label={c.zinsen} type="number" value={String(facts.claim.zinsen)}
              onChange={(v) => setFacts({ ...facts, claim: { ...facts.claim, zinsen: Number(v) } })} />
            <Field label={c.total} type="number" value={String(facts.claim.total)}
              onChange={(v) => setFacts({ ...facts, claim: { ...facts.claim, total: Number(v) } })} />
          </div>

          <div className="flex flex-col gap-2">
            <Toggle label={c.parallelBilling} checked={Boolean(facts.evidence.parallel_billing)}
              onChange={(v) => setFacts({ ...facts, evidence: { ...facts.evidence, parallel_billing: v } })} />
            <Toggle label={c.dataDelay} checked={Boolean(facts.evidence.data_exchange_delay_admitted)}
              onChange={(v) => setFacts({ ...facts, evidence: { ...facts.evidence, data_exchange_delay_admitted: v } })} />
          </div>

          <button type="button" onClick={confirmFacts} disabled={busy}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {busy ? c.evaluating : c.confirmFacts}
          </button>
        </section>
      )}

      {step === 2 && evaluation && (
        <section className="mt-8 flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={c.risk} value={evaluation.risk} tone={evaluation.risk} />
            <Stat label={c.reducible} value={money(evaluation.reducible_total)} />
            <Stat label={c.deadline} value={evaluation.deadline_status} />
          </div>

          <ul className="flex flex-col gap-3">
            {evaluation.positions.map((p) => (
              <li key={p.rule} className="glass-surface rounded-xl p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">
                    <span className="text-muted-foreground">{p.rule}</span> · {p.label}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.assessment}{p.amount > 0 ? ` · ${money(p.amount)}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.basis}</p>
                <p className="mt-2 text-sm">{p.recommendation}</p>
              </li>
            ))}
          </ul>

          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            {evaluation.disclaimer}
          </p>

          <p className="text-sm">
            <span className="font-semibold">{c.actions}: </span>
            {evaluation.actions.join(" · ")}
          </p>

          <button type="button" onClick={makeDrafts} disabled={busy}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {busy ? c.generating : c.generateDrafts}
          </button>
        </section>
      )}

      {(step === 3 || step === 4) && (
        <section className="mt-8 flex flex-col gap-6">
          {drafts.map((d) => (
            <article key={d.action} className="glass-surface rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{d.title}</h2>
                {d.approved ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="size-3.5" /> {c.approved}
                  </span>
                ) : (
                  <button type="button" onClick={() => approve(d.action)} disabled={busy}
                    className="rounded-lg border border-primary px-4 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">
                    {c.approve}
                  </button>
                )}
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-xs leading-6">
                {d.body}
              </pre>
            </article>
          ))}

          {guidance.length > 0 && (
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-sm font-semibold">{c.guidance}</p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {guidance.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
      {label}
    </label>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const color =
    tone === "high" ? "text-destructive" : tone === "medium" ? "text-primary" : "text-foreground"
  return (
    <div className="glass-surface rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

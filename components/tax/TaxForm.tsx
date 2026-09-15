"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

const STEPS = [
  { id: 1, title: "Berufliche Situation", short: "Situation" },
  { id: 2, title: "Ausgabenkategorien", short: "Ausgaben" },
  { id: 3, title: "Zusammenfassung", short: "Prüfen" },
] as const

const PROFESSIONS = [
  { value: "employee", label: "Arbeitnehmer/in", description: "Anstellung mit Lohnsteuerbescheinigung" },
  { value: "freelancer", label: "Freiberufler/in / Selbstständig", description: "Einnahmen aus selbstständiger Tätigkeit" },
  { value: "student", label: "Student/in", description: "Studium mit oder ohne Nebenjob" },
  { value: "other", label: "Sonstiges", description: "Andere berufliche Situation" },
] as const

type Profession = (typeof PROFESSIONS)[number]["value"]

const EXPENSE_FIELDS = [
  { key: "home_office", label: "Homeoffice / häusliches Arbeitszimmer", hint: "Anteilige Kosten oder Pauschale laut deinen Belegen" },
  { key: "work_equipment", label: "Arbeitsmittel", hint: "Laptop, Software, Fachliteratur, Büroausstattung" },
  { key: "commuting", label: "Pendlerpauschale / Entfernungspauschale", hint: "Einfache Entfernung × Arbeitstage — Betrag in € erfassen" },
  { key: "professional_training", label: "Fortbildung / Weiterbildung", hint: "Kurse, Seminare, Prüfungsgebühren" },
  { key: "work_clothing", label: "Typische Berufskleidung", hint: "Nur typische Arbeitskleidung, keine Alltagskleidung" },
  { key: "other_expenses", label: "Weitere Werbungskosten", hint: "Kontoführungsgebühren, Fachzeitschriften u. a." },
] as const

type ExpenseKey = (typeof EXPENSE_FIELDS)[number]["key"]
type Expenses = Record<ExpenseKey, string>

const emptyExpenses = (): Expenses =>
  Object.fromEntries(EXPENSE_FIELDS.map((field) => [field.key, ""])) as Expenses

function parseAmount(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  if (!normalized) return 0
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount)
}

function professionLabel(value: Profession | ""): string {
  return PROFESSIONS.find((item) => item.value === value)?.label ?? "—"
}

export function TaxForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profession, setProfession] = useState<Profession | "">("")
  const [expenses, setExpenses] = useState<Expenses>(emptyExpenses)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const expenseTotals = useMemo(() => {
    const amounts = Object.fromEntries(
      EXPENSE_FIELDS.map((field) => [field.key, parseAmount(expenses[field.key])])
    ) as Record<ExpenseKey, number>
    const total = EXPENSE_FIELDS.reduce((sum, field) => sum + amounts[field.key], 0)
    return { amounts, total }
  }, [expenses])

  const progress = (step / STEPS.length) * 100

  function updateExpense(key: ExpenseKey, value: string) {
    if (value !== "" && !/^\d*([.,]\d{0,2})?$/.test(value)) return
    setExpenses((current) => ({ ...current, [key]: value }))
  }

  function goNext() {
    setError(null)
    if (step === 1 && !profession) {
      setError("Bitte wähle deine berufliche Situation.")
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length))
  }

  function goBack() {
    setError(null)
    setStep((current) => Math.max(current - 1, 1))
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        router.push("/auth/login?next=/steuer")
        return
      }
      if (!profession) {
        setError("Bitte wähle deine berufliche Situation.")
        setStep(1)
        return
      }

      const { data, error: insertError } = await supabase
        .from("tax_assessments")
        .insert({
          user_id: authData.user.id,
          profession,
          expenses: expenseTotals.amounts,
          total_amount: expenseTotals.total,
        })
        .select("id")
        .single()

      if (insertError) {
        setError("Speichern nicht möglich. Bitte versuche es erneut.")
        return
      }

      setSubmittedId(data.id)
    } catch {
      setError("Unerwarteter Fehler beim Speichern.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedId) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="tax-success-title">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 id="tax-success-title" className="text-2xl font-semibold text-foreground">
              Erfassung gespeichert
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Deine Angaben wurden gesichert. Die Summe ({formatEuro(expenseTotals.total)}) ist die Summe der
              erfassten Ausgaben — keine berechnete Steuererstattung und kein finaler Bescheid.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSubmittedId(null)
              setProfession("")
              setExpenses(emptyExpenses())
              setStep(1)
            }}
          >
            Neue Erfassung
          </Button>
          <Button type="button" onClick={() => router.push("/dashboard")}>
            Zum Dashboard
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="tax-form-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Steuer-Erfassung</p>
          <h2 id="tax-form-title" className="mt-1 text-2xl font-semibold text-foreground">
            {STEPS[step - 1].title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Schritt {step} von {STEPS.length}. Erfasste Beträge sind deine Angaben — keine automatische
            Steuerberechnung.
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{Math.round(progress)}%</p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Fortschritt der Steuer-Erfassung"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              item.id === step
                ? "border-primary/40 bg-primary/10 text-primary"
                : item.id < step
                  ? "border-border bg-muted/60 text-foreground"
                  : "border-border text-muted-foreground"
            }`}
          >
            {item.id}. {item.short}
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 1 && (
          <fieldset>
            <legend className="sr-only">Berufliche Situation wählen</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROFESSIONS.map((option) => {
                const selected = profession === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setProfession(option.value)
                      setError(null)
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                    aria-pressed={selected}
                  >
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {EXPENSE_FIELDS.map((field) => (
              <div key={field.key} className="grid gap-2 border-t border-border pt-5 first:border-t-0 first:pt-0">
                <Label htmlFor={field.key}>{field.label}</Label>
                <p className="text-xs text-muted-foreground">{field.hint}</p>
                <div className="relative max-w-xs">
                  <Input
                    id={field.key}
                    inputMode="decimal"
                    placeholder="0,00"
                    value={expenses[field.key]}
                    onChange={(event) => updateExpense(field.key, event.target.value)}
                    className="pr-10"
                    aria-describedby={`${field.key}-hint`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    €
                  </span>
                </div>
                <span id={`${field.key}-hint`} className="sr-only">
                  Betrag in Euro
                </span>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Situation</p>
              <p className="mt-2 text-lg font-medium text-foreground">{professionLabel(profession)}</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Erfasste Ausgabenkategorien</caption>
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kategorie</th>
                    <th className="px-4 py-3 text-right font-medium">Betrag</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPENSE_FIELDS.map((field) => (
                    <tr key={field.key} className="border-t border-border">
                      <td className="px-4 py-3 text-foreground">{field.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatEuro(expenseTotals.amounts[field.key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-primary/5">
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-foreground">
                      Summe erfasster Ausgaben
                    </th>
                    <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-foreground">
                      {formatEuro(expenseTotals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                Mit „Absenden“ speicherst du deine Angaben in deinem Konto. Das ist keine Steuerberatung und keine
                Berechnung einer Erstattung.
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || submitting}>
          <ArrowLeft /> Zurück
        </Button>
        {step < STEPS.length ? (
          <Button type="button" onClick={goNext}>
            Weiter <ArrowRight data-icon="inline-end" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin" /> : null}
            {submitting ? "Wird gespeichert…" : "Absenden"}
          </Button>
        )}
      </div>
    </section>
  )
}

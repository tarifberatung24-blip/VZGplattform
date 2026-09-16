"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, CircleAlert, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { taxQuestionnaire2025, type TaxQuestion } from "@/lib/tax-questionnaire-schema"
import { createClient } from "@/lib/supabase/client"
import { buildCanonicalTaxReturn } from "@/lib/tax-pipeline"

const categoryLabels: Record<TaxQuestion["category"], string> = {
  personal_data: "Лични данни",
  employment: "Работа и Lohnsteuerbescheinigung",
  commuting: "Пътуване до работа",
  home_office: "Homeoffice",
  advertising_expenses: "Werbungskosten",
  children: "Деца",
  vorsorgeaufwand: "Vorsorgeaufwand",
  sonderausgaben: "Sonderausgaben",
  extraordinary_burdens: "Außergewöhnliche Belastungen",
  household_services: "Haushaltsnahe Aufwendungen",
  support_payments: "Unterhalt",
  double_household: "Doppelte Haushaltsführung",
}

export function TaxQuestionnaire({ initialCase }: { initialCase: { id: string; answers: Record<string, unknown>; status: string } | null }) {
  const [caseId, setCaseId] = useState(initialCase?.id ?? null)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialCase?.answers ?? {})
  const [openHelp, setOpenHelp] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(Boolean(initialCase))
  const applicable = useMemo(() => taxQuestionnaire2025, [])
  const answered = applicable.filter((question) => String(answers[question.question_id] ?? "").trim().length > 0).length
  const progress = applicable.length ? Math.round((answered / applicable.length) * 100) : 0

  async function saveAnswers() {
    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const canonical = buildCanonicalTaxReturn(answers)
    const payload = { user_id: userData.user.id, tax_year: 2025, status: "in_progress", data: { questionnaire_answers: answers, canonical_tax_return: canonical } }
    const result = caseId
      ? await supabase.from("tax_cases").update(payload).eq("id", caseId).select("id").single()
      : await supabase.from("tax_cases").insert(payload).select("id").single()
    if (result.data?.id) setCaseId(result.data.id)
    setSaved(!result.error)
    setSaving(false)
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="questionnaire-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Steuererklärung 2025</p>
          <h2 id="questionnaire-title" className="mt-1 text-2xl font-semibold text-foreground">Fragebogen für Arbeitnehmer</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Die Fragen sind als sichere Datenerfassung vorbereitet. Unverifizierte Fragen beeinflussen keine Steuerlogik und keine Berechnung.</p>
        </div>
        <div className="min-w-40 text-right"><p className="text-2xl font-semibold text-foreground">{progress}%</p><p className="text-xs text-muted-foreground">{answered} von {applicable.length} beantwortet</p></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="mt-6 space-y-6">
        {applicable.map((question) => {
          const helpOpen = openHelp === question.question_id
          return <div key={question.question_id} className="border-t border-border pt-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-medium text-primary">{categoryLabels[question.category]}</p><label htmlFor={question.question_id} className="mt-1 block font-medium text-foreground">{question.bulgarian_question}</label><p className="mt-1 text-sm text-muted-foreground">Официален термин: {question.official_german_label}</p></div>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground"><CircleAlert className="size-3" /> {question.verification_status}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input id={question.question_id} value={String(answers[question.question_id] ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.question_id]: event.target.value }))} placeholder="Въведи информация или остави празно" /><Button type="button" variant="ghost" size="sm" onClick={() => setOpenHelp(helpOpen ? null : question.question_id)} aria-expanded={helpOpen}>{helpOpen ? <ChevronUp /> : <ChevronDown />} Помощ</Button></div>
            {helpOpen && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm leading-6 text-muted-foreground"><p><strong>Какво означава това?</strong> {question.bulgarian_help}</p><p className="mt-2"><strong>Защо се изисква?</strong> {question.why_required}</p><p className="mt-2 text-xs">Източник: {question.source_form}; раздел и страница: не са верифицирани.</p></div>}
          </div>
        })}
      </div>
      <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5"><p className="text-sm text-muted-foreground">{saved ? "Запазено в твоя данъчен случай." : "Можеш да продължиш по-късно."}</p><Button type="button" onClick={saveAnswers} disabled={saving}><Save />{saving ? "Запазване…" : "Запази и продължи"}</Button></div>
    </section>
  )
}

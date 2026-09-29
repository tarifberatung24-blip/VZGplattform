"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, CircleAlert, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { taxQuestionnaire2025, type TaxQuestion } from "@/lib/tax-questionnaire-schema"
import { createClient } from "@/lib/supabase/client"
import { buildCanonicalTaxReturn } from "@/lib/tax-pipeline"
import { useLanguage } from "@/lib/i18n/language-context"

const categoryLabels: Record<TaxQuestion["category"], { bg: string; de: string }> = {
  personal_data: { bg: "Лични данни", de: "Persönliche Daten" },
  employment: { bg: "Работа и Lohnsteuerbescheinigung", de: "Arbeit und Lohnsteuerbescheinigung" },
  commuting: { bg: "Пътуване до работа", de: "Weg zur Arbeit" },
  home_office: { bg: "Homeoffice", de: "Homeoffice" },
  advertising_expenses: { bg: "Werbungskosten", de: "Werbungskosten" },
  children: { bg: "Деца", de: "Kinder" },
  vorsorgeaufwand: { bg: "Vorsorgeaufwand", de: "Vorsorgeaufwand" },
  sonderausgaben: { bg: "Sonderausgaben", de: "Sonderausgaben" },
  extraordinary_burdens: { bg: "Außergewöhnliche Belastungen", de: "Außergewöhnliche Belastungen" },
  household_services: { bg: "Haushaltsnahe Aufwendungen", de: "Haushaltsnahe Aufwendungen" },
  support_payments: { bg: "Unterhalt", de: "Unterhalt" },
  double_household: { bg: "Doppelte Haushaltsführung", de: "Doppelte Haushaltsführung" },
}

export function TaxQuestionnaire({ initialCase }: { initialCase: { id: string; answers: Record<string, unknown>; status: string } | null }) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = de
    ? {
        intro: "Die Fragen sind als sichere Datenerfassung vorbereitet. Unverifizierte Fragen beeinflussen keine Steuerlogik und keine Berechnung.",
        answered: "von",
        answeredSuffix: "beantwortet",
        officialTerm: "Offizieller Begriff:",
        placeholder: "Angabe eingeben oder leer lassen",
        help: "Hilfe",
        whatMeans: "Was bedeutet das?",
        whyRequired: "Warum ist das erforderlich?",
        source: "Quelle:",
        sourceNote: "; Abschnitt und Seite sind nicht verifiziert.",
        whyRequiredVerified: "Das Feld ist im genannten offiziellen Formular und in der Zeile aufgeführt.",
        whyRequiredUnverified: "Wird erst durch eine offizielle Quelle für 2025 bestätigt.",
        savedNote: "In deinem Steuerfall gespeichert.",
        continueLaterNote: "Du kannst später fortfahren.",
        saving: "Wird gespeichert…",
        save: "Speichern und fortfahren",
        verified: "Quelle bestätigt",
        unverified: "Quelle noch offen",
      }
    : {
        intro: "Въпросите са подготвени за сигурно въвеждане на данни. Неверифицираните въпроси не влияят на данъчната логика и на изчисленията.",
        answered: "от",
        answeredSuffix: "отговорени",
        officialTerm: "Официален термин:",
        placeholder: "Въведи информация или остави празно",
        help: "Помощ",
        whatMeans: "Какво означава това?",
        whyRequired: "Защо се изисква?",
        source: "Източник:",
        sourceNote: "; раздел и страница: не са верифицирани.",
        whyRequiredVerified: "Полето е изписано в посочения официален формуляр и ред.",
        whyRequiredUnverified: "Ще бъде потвърдено само чрез официален източник за 2025 г.",
        savedNote: "Запазено в твоя данъчен случай.",
        continueLaterNote: "Можеш да продължиш по-късно.",
        saving: "Запазване…",
        save: "Запази и продължи",
        verified: "Източникът е потвърден",
        unverified: "Източникът още не е потвърден",
      }
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
    <section className="mt-10 rounded-md border border-border bg-card p-6 sm:p-8" aria-labelledby="questionnaire-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{de ? "Steuererklärung 2025" : "Данъчна декларация 2025"}</p>
          <h2 id="questionnaire-title" className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{de ? "Fragebogen für Arbeitnehmer" : "Въпросник за работещи"}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{copy.intro}</p>
        </div>
        <div className="min-w-40 text-right"><p className="text-2xl font-semibold text-foreground">{progress}%</p><p className="text-xs text-muted-foreground">{answered} {copy.answered} {applicable.length} {copy.answeredSuffix}</p></div>
      </div>
       <div className="mt-6 h-2 overflow-hidden bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
       <div className="mt-8 space-y-8">
        {applicable.map((question) => {
          const helpOpen = openHelp === question.question_id
          return <div key={question.question_id} className="border-t border-border pt-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-medium text-primary">{categoryLabels[question.category][de ? "de" : "bg"]}</p><label htmlFor={question.question_id} className="mt-1 block font-medium text-foreground">{de ? question.german_question : question.bulgarian_question}</label><p className="mt-1 text-sm text-muted-foreground">{copy.officialTerm} {question.official_german_label}</p></div>
               <span className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-[11px] font-bold text-muted-foreground"><CircleAlert className="size-3" /> {question.verification_status === "VERIFIED" ? copy.verified : copy.unverified}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input id={question.question_id} value={String(answers[question.question_id] ?? "")} onChange={(event) => setAnswers((current) => ({ ...current, [question.question_id]: event.target.value }))} placeholder={copy.placeholder} /><Button type="button" variant="ghost" size="sm" onClick={() => setOpenHelp(helpOpen ? null : question.question_id)} aria-expanded={helpOpen}>{helpOpen ? <ChevronUp /> : <ChevronDown />} {copy.help}</Button></div>
             {helpOpen && <div className="mt-4 rounded-sm border border-border bg-background p-4 text-sm leading-7 text-muted-foreground"><p><strong>{copy.whatMeans}</strong> {de ? question.german_help : question.bulgarian_help}</p><p className="mt-2"><strong>{copy.whyRequired}</strong> {question.verification_status === "VERIFIED" ? copy.whyRequiredVerified : copy.whyRequiredUnverified}</p><p className="mt-2 text-xs">{copy.source} {question.source_form}{copy.sourceNote}</p></div>}
          </div>
        })}
      </div>
      <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5"><p className="text-sm text-muted-foreground">{saved ? copy.savedNote : copy.continueLaterNote}</p><Button type="button" onClick={saveAnswers} disabled={saving}><Save />{saving ? copy.saving : copy.save}</Button></div>
    </section>
  )
}

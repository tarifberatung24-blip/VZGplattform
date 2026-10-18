"use client"

import { useActionState } from "react"
import { CircleAlert, FileText, ListChecks, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  initialUpdateCostReductionDetailsState,
  updateCostReductionDetails,
} from "@/lib/horizon/cost-reduction/actions"
import { deriveServiceRequestReadiness } from "@/lib/horizon/service-requests/readiness"
import type {
  CaseSourceDocument,
  ExtractedFact,
  HorizonCaseStatus,
} from "@/lib/horizon/case/contract"

function latestValue(facts: readonly ExtractedFact[], key: string) {
  for (let index = facts.length - 1; index >= 0; index -= 1) {
    const fact = facts[index]
    if (fact.key === key && fact.value.trim()) return fact.value
  }
  return ""
}

export function EnergyRequestProgress({
  caseId,
  locale,
  status,
  facts,
  documents,
}: {
  caseId: string
  locale: string
  status: HorizonCaseStatus
  facts: readonly ExtractedFact[]
  documents: readonly CaseSourceDocument[]
}) {
  const de = locale === "de"
  const [state, formAction, pending] = useActionState(
    updateCostReductionDetails,
    initialUpdateCostReductionDetailsState,
  )
  const readiness = deriveServiceRequestReadiness({
    serviceType: "energy_cost_check",
    facts,
    documentCount: documents.length,
  })
  const missing = state.ok ? state.missingFactKeys : readiness.missingFactKeys
  const activeStage = status === "waiting_for_user" ? 1 : status === "action_ready" || status === "completed" ? 3 : 2
  const copy = de
    ? {
        eyebrow: "Persönliche Energie-Anfrage",
        title: "Dein Status und die nächsten Angaben",
        urgent: "Dringender Hinweis erkannt. Prüfe das Schreiben und den Termin sofort; der Vorgang ist für eine persönliche Prüfung markiert.",
        stages: ["Anfrage eingegangen", "Angaben ergänzen", "Persönliche Prüfung", "Nächster Schritt bereit"],
        received: "Deine Anfrage und ihre Dokumente bleiben in diesem geschützten Vorgang.",
        waiting: "Damit wir ohne Dokumente vergleichen können, ergänze bitte nur die folgenden Angaben. Unbekannte Felder musst du nicht raten.",
        processing: "Die erste Prüfung ist vorbereitet. Ein Angebot oder eine Änderung wird niemals ohne deine persönliche Zustimmung ausgelöst.",
        documents: (count: number) => `${count} Dokument${count === 1 ? "" : "e"} in diesem Vorgang`,
        save: "Angaben sicher speichern",
        saving: "Wird gespeichert …",
        saved: "Deine Angaben wurden gespeichert.",
        failed: "Die Angaben konnten nicht gespeichert werden. Bitte versuche es erneut.",
        fields: {
          postcode: "Postleitzahl",
          current_provider: "Aktueller Anbieter",
          annual_consumption_kwh: "Jahresverbrauch in kWh",
          monthly_payment_eur: "Monatlicher Abschlag in EUR",
        },
      }
    : {
        eyebrow: "Лична енергийна заявка",
        title: "Твоят статус и следващи данни",
        urgent: "Разпозната е спешна ситуация. Провери писмото и срока веднага; случаят е отбелязан за личен преглед.",
        stages: ["Заявката е получена", "Допълни данни", "Личен преглед", "Следващата стъпка е готова"],
        received: "Заявката и документите ти остават в този защитен случай.",
        waiting: "За да направим проверка без документи, попълни само следните данни. Не гадай непознати полета.",
        processing: "Първоначалната проверка е подготвена. Оферта или промяна никога не се стартира без твоето лично съгласие.",
        documents: (count: number) => `${count} документ${count === 1 ? "" : "а"} в тази заявка`,
        save: "Запази данните сигурно",
        saving: "Запазва се …",
        saved: "Данните ти са запазени.",
        failed: "Данните не можаха да се запазят. Опитай отново.",
        fields: {
          postcode: "Пощенски код",
          current_provider: "Настоящ доставчик",
          annual_consumption_kwh: "Годишно потребление в kWh",
          monthly_payment_eur: "Месечна вноска в EUR",
        },
      }

  return (
    <section id="energy-request-progress" className="paper paper-note space-y-5 p-4 sm:p-5" aria-labelledby="energy-request-progress-title">
      <div className="flex items-start gap-3">
        <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{copy.eyebrow}</p>
          <h2 id="energy-request-progress-title" className="mt-1 text-lg font-bold">{copy.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.received}</p>
        </div>
      </div>

      {readiness.urgent ? <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-foreground"><CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />{copy.urgent}</div> : null}

      <ol className="grid gap-2 sm:grid-cols-4">
        {copy.stages.map((label, index) => <li key={label} className={`rounded-lg border p-3 text-xs font-semibold ${index < activeStage ? "border-success/40 bg-success/5 text-foreground" : index === activeStage ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}><span className="block text-[10px] uppercase tracking-wide opacity-70">{index + 1}</span><span className="mt-1 block">{label}</span></li>)}
      </ol>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4 text-primary" aria-hidden="true" />{copy.documents(documents.length)}</div>

      {missing.length > 0 ? <form action={formAction} className="rounded-xl border border-border bg-background p-4">
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="locale" value={locale} />
        <p className="text-sm leading-6 text-muted-foreground">{copy.waiting}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {missing.map((key) => <label key={key} className="space-y-2 text-sm font-medium">{copy.fields[key as keyof typeof copy.fields] ?? key}<Input name={key === "current_provider" ? "provider" : key === "annual_consumption_kwh" ? "annualConsumption" : key === "monthly_payment_eur" ? "monthlyPayment" : key} defaultValue={latestValue(facts, key)} inputMode={key === "postcode" || key === "annual_consumption_kwh" ? "numeric" : key === "monthly_payment_eur" ? "decimal" : undefined} className="h-11" /></label>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}{pending ? copy.saving : copy.save}</Button>{state.ok ? <span role="status" className="text-sm text-success">{copy.saved}</span> : null}{state.error ? <span role="alert" className="text-sm text-destructive">{copy.failed}</span> : null}</div>
      </form> : <p className="text-sm leading-6 text-muted-foreground">{copy.processing}</p>}
    </section>
  )
}

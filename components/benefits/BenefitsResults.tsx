"use client"

import Link from "next/link"
import { ExternalLink, RotateCcw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BenefitResult } from "@/lib/benefits/types"
import { statusTone, toneClasses, type BenefitCheckState } from "@/lib/status"
import { useLanguage } from "@/lib/i18n/language-context"

const stateLabel: Record<BenefitCheckState, { de: string; bg: string }> = {
  POTENTIALLY_ELIGIBLE: { de: "Potenziell prüfenswert", bg: "Потенциално за проверка" },
  MORE_INFORMATION_REQUIRED: { de: "Mehr Angaben nötig", bg: "Нужни са повече данни" },
  LIKELY_NOT_ELIGIBLE: { de: "Wahrscheinlich nicht passend", bg: "Вероятно не е подходящо" },
  APPLICATION_READY: { de: "Antrag vorbereiten", bg: "Подготовка на заявление" },
  REQUIRES_AUTHORITY_REVIEW: { de: "Behörde prüfen lassen", bg: "Проверка от учреждение" },
}

export function BenefitsResults({
  results,
  actionable,
  ruleVersion,
  onRestart,
}: {
  results: BenefitResult[]
  actionable: BenefitResult[]
  ruleVersion: string
  onRestart: () => void
}) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const focus = actionable.length > 0 ? actionable : results.filter((item) => item.state === "POTENTIALLY_ELIGIBLE")
  const display = focus.length > 0 ? focus : results.slice(0, 3)

  return (
    <section className="space-y-6" aria-labelledby="benefits-results-title">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {de ? "Results Dashboard" : "Табло с резултати"}
            </p>
            <h2 id="benefits-results-title" className="mt-1 text-2xl font-semibold text-foreground">
              {de ? "Deine Vorprüfung" : "Твоята предварителна проверка"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {de
                ? `${display.length} Leistung(en) zum Weiterprüfen. Regelversion ${ruleVersion}. Keine Zusage und keine Euro-Beträge.`
                : `${display.length} помощ(и) за последваща проверка. Версия на правилата ${ruleVersion}. Без обещание и без суми в евро.`}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onRestart}>
            <RotateCcw /> {de ? "Neu starten" : "Започни отново"}
          </Button>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {de
              ? "„Potenziell prüfenswert“ bedeutet: deine Antworten treffen eine interne Screening-Regel. Das ersetzt keine Entscheidung von Familienkasse, Jobcenter oder Kommune."
              : "„Потенциално за проверка“ означава: отговорите ти покриват вътрешно скрининг правило. Това не замества решение на Familienkasse, Jobcenter или общината."}
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {display.map((item) => (
          <article key={item.benefitId} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{de ? item.titleDe : item.titleBg}</h3>
                <p className="mt-1 text-xs text-muted-foreground">rule: {item.reasonCode}</p>
              </div>
              <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${toneClasses[statusTone[item.state]]}`}>
                {de ? stateLabel[item.state].de : stateLabel[item.state].bg}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {de ? item.explanationDe : item.explanationBg}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href={item.nextStepRoute}>{de ? "In der Plattform weiter" : "Продължи в платформата"}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={item.officialInfoUrl} target="_blank" rel="noopener noreferrer">
                  {de ? "Offizielle Info" : "Официална информация"} <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <details className="rounded-2xl border border-border bg-card p-5 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">
          {de ? "Alle Screening-Ergebnisse anzeigen" : "Покажи всички скрининг резултати"}
        </summary>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          {results.map((item) => (
            <li key={`all-${item.benefitId}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-foreground">{de ? item.titleDe : item.titleBg}</span>
              <span className={`rounded-md px-2 py-0.5 text-xs ${toneClasses[statusTone[item.state]]}`}>
                {de ? stateLabel[item.state].de : stateLabel[item.state].bg}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}

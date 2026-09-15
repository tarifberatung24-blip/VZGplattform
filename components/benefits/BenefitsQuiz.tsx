"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveBenefitCheck } from "@/app/anspruch/actions"
import { actionableBenefitResults } from "@/lib/benefits/eligibility-engine"
import { BENEFIT_QUIZ_QUESTIONS } from "@/lib/benefits/quiz-questions"
import type { BenefitAnswers, BenefitAnswerKey, BenefitCheckRecord, BenefitResult } from "@/lib/benefits/types"
import { BenefitsResults } from "@/components/benefits/BenefitsResults"
import { useLanguage } from "@/lib/i18n/language-context"

function emptyAnswers(): Partial<Record<BenefitAnswerKey, boolean>> {
  return {}
}

export function BenefitsQuiz() {
  const router = useRouter()
  const { locale } = useLanguage()
  const de = locale === "de"
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<BenefitCheckRecord | null>(null)
  const [isPending, startTransition] = useTransition()

  const question = BENEFIT_QUIZ_QUESTIONS[index]
  const progress = ((index + (answers[question.key] !== undefined ? 1 : 0)) / BENEFIT_QUIZ_QUESTIONS.length) * 100

  function selectAnswer(value: boolean) {
    setError(null)
    setAnswers((current) => ({ ...current, [question.key]: value }))
  }

  function goNext() {
    if (answers[question.key] === undefined) {
      setError(de ? "Bitte Ja oder Nein wählen." : "Моля избери Да или Не.")
      return
    }
    if (index < BENEFIT_QUIZ_QUESTIONS.length - 1) {
      setIndex((current) => current + 1)
      return
    }
    submit()
  }

  function goBack() {
    setError(null)
    setIndex((current) => Math.max(0, current - 1))
  }

  function submit() {
    const complete = Object.fromEntries(
      BENEFIT_QUIZ_QUESTIONS.map((item) => [item.key, Boolean(answers[item.key])])
    ) as BenefitAnswers

    if (BENEFIT_QUIZ_QUESTIONS.some((item) => answers[item.key] === undefined)) {
      setError(de ? "Bitte alle Fragen beantworten." : "Моля отговори на всички въпроси.")
      return
    }

    startTransition(async () => {
      const result = await saveBenefitCheck(complete)
      if (!result.ok) {
        if (result.code === "AUTH_REQUIRED") {
          toast.error(de ? "Bitte melde dich an." : "Моля влез в профила си.")
          router.push("/auth/login?next=/anspruch")
          return
        }
        if (result.code === "SCHEMA_MISSING") {
          toast.error(
            de
              ? "Speichern nicht möglich — Tabelle benefit_checks fehlt noch."
              : "Записът не е възможен — таблицата benefit_checks още липсва."
          )
          setError(
            de
              ? "Die Datenbanktabelle benefit_checks ist noch nicht angelegt. SQL zuerst in Supabase ausführen."
              : "Таблицата benefit_checks още не е създадена. Първо изпълни SQL в Supabase."
          )
          return
        }
        toast.error(de ? "Speichern fehlgeschlagen." : "Записът се провали.")
        setError(de ? "Unerwarteter Fehler beim Speichern." : "Неочаквана грешка при запис.")
        return
      }

      toast.success(de ? "Prüfung gespeichert." : "Проверката е записана.")
      setSaved(result.check)
    })
  }

  if (saved) {
    const actionable = actionableBenefitResults(saved.results as BenefitResult[])
    return (
      <BenefitsResults
        results={saved.results as BenefitResult[]}
        actionable={actionable}
        ruleVersion={saved.rule_version}
        onRestart={() => {
          setSaved(null)
          setAnswers(emptyAnswers())
          setIndex(0)
          setError(null)
        }}
      />
    )
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="benefits-quiz-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {de ? "Eligibility Engine · Screening" : "Eligibility Engine · Скрининг"}
          </p>
          <h2 id="benefits-quiz-title" className="mt-1 text-2xl font-semibold text-foreground">
            {de ? "Leistungen grob einordnen" : "Грубо ориентиране за помощи"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {de
              ? "Ja/Nein-Fragen für eine strukturierte Vorprüfung. Keine Behördenentscheidung und keine Euro-Beträge."
              : "Въпроси с Да/Не за структурирана предварителна проверка. Без решение от учреждение и без суми в евро."}
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {index + 1}/{BENEFIT_QUIZ_QUESTIONS.length}
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={de ? "Quiz-Fortschritt" : "Напредък на квиза"}
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.max(progress, 8)}%` }} />
      </div>

      <article className="mt-8 rounded-xl border border-border bg-background p-5 sm:p-6">
        <p className="text-xs font-medium text-primary">
          {de ? `Frage ${index + 1}` : `Въпрос ${index + 1}`}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">
          {de ? question.titleDe : question.titleBg}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {de ? question.helpDe : question.helpBg}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            { value: true, labelDe: "Ja", labelBg: "Да" },
            { value: false, labelDe: "Nein", labelBg: "Не" },
          ].map((option) => {
            const selected = answers[question.key] === option.value
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => selectAnswer(option.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
                aria-pressed={selected}
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {selected ? <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> : null}
                  {de ? option.labelDe : option.labelBg}
                </span>
              </button>
            )
          })}
        </div>
      </article>

      {error && (
        <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          {de
            ? "Ergebnis = potenziell prüfenswert laut Regeln — kein Anspruch und keine Zusage."
            : "Резултат = потенциално за проверка по правила — не е право и не е обещание."}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={goBack} disabled={index === 0 || isPending}>
          <ArrowLeft /> {de ? "Zurück" : "Назад"}
        </Button>
        <Button type="button" onClick={goNext} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {index === BENEFIT_QUIZ_QUESTIONS.length - 1
            ? isPending
              ? de
                ? "Speichern…"
                : "Запис…"
              : de
                ? "Ergebnis anzeigen"
                : "Покажи резултат"
            : de
              ? "Weiter"
              : "Напред"}
          {!isPending && index < BENEFIT_QUIZ_QUESTIONS.length - 1 ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </div>
    </section>
  )
}

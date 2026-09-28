"use client"

import Link from "next/link"
import { ArrowRight, CircleHelp } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

type Question = {
  id: string
  label: string
  detail: string
  href: string
}

type Props = {
  questions: Question[]
}

export function MissingInformationInterviewer({ questions }: Props) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const visibleQuestions = questions.slice(0, 3)
  if (visibleQuestions.length === 0) return null

  return (
    <section className="mt-4 rounded-2xl border border-border bg-secondary p-5 text-foreground" aria-labelledby="missing-info-title">
      <div className="flex items-start gap-3">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Missing Information Interviewer</p>
          <h2 id="missing-info-title" className="mt-1 font-semibold">{de ? "Es fehlen noch einige Angaben" : "Нужни са още няколко факта"}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{de ? "Beantworte nur, was wirklich fehlt. Wir erfinden keine Werte für dich." : "Отговори само на реално липсващото. Няма да предполагаме стойности вместо теб."}</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-2">
        {visibleQuestions.map((question, index) => (
          <li key={question.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary">{de ? `Frage ${index + 1}` : `Въпрос ${index + 1}`}</p>
              <p className="mt-0.5 font-medium">{question.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{question.detail}</p>
            </div>
            <Link href={question.href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline">
              {de ? "Antworten" : "Отговори"} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
      {questions.length > 3 && <p className="mt-3 text-xs text-muted-foreground">{de ? "Die ersten 3 Fragen werden angezeigt. Danach geht es mit den übrigen weiter." : "Показани са първите 3 въпроса. След тях ще продължим с останалите."}</p>}
    </section>
  )
}

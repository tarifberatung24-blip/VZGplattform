"use client"

import { useMemo, useState } from "react"
import { localizedPath } from "@/lib/i18n/routing"
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react"
import Link from "next/link"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { BrandText, HorizonWordmark } from "@/components/brand/horizon-wordmark"

type Lesson = {
  id: string
  slug: string
  level: string
  category: string
  title: string
  summary: string
  content: string
  context_key: string | null
  source_reference: string | null
}

type Props = {
  lessons: Lesson[]
  locale: "bg" | "de"
  profileCompleteness: number
  contractCount: number
}

const levelLabels: Record<"de" | "bg", Record<string, string>> = {
  de: { beginner: "Grundlagen", intermediate: "Aufbau" },
  bg: { beginner: "Начинаещи", intermediate: "Напреднали" },
}

/** Lessons store a raw level enum; the UI shows localized words, not `beginner`. */
function levelLabel(level: string, de: boolean) {
  return levelLabels[de ? "de" : "bg"][level] ?? level
}

export function FinancialEducationPage({ lessons, locale, profileCompleteness, contractCount }: Props) {
  const de = locale === "de"
  const [selectedSlug, setSelectedSlug] = useState(lessons[0]?.slug ?? "")
  const selected = lessons.find((lesson) => lesson.slug === selectedSlug) ?? lessons[0]
  const contextLesson = useMemo(() => {
    if (profileCompleteness < 60) return lessons.find((lesson) => lesson.context_key === "cashflow") ?? lessons[0]
    if (contractCount > 0) return lessons.find((lesson) => lesson.context_key === "cashflow") ?? lessons[0]
    return lessons.find((lesson) => lesson.context_key === "net_worth") ?? lessons[0]
  }, [contractCount, lessons, profileCompleteness])

  return (
    <WorkspacePage>
      <div>
        <header className="rounded-md border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary"><HorizonWordmark /> · Finanzbildung</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight">{de ? "Verstehen, bevor du entscheidest" : "Разбери финансите си, преди да решаваш"}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{de ? "Kurze, quellengebundene Lernschritte direkt aus deinem Finanz-Workflow. Keine Produktwerbung und keine automatische Empfehlung." : "Кратки, проверими уроци, свързани с реалния ти финансов workflow. Без продуктова реклама и без автоматични препоръки."}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary"><LockKeyhole className="size-3.5" /> {de ? "Pilot · nur Bildung" : "Пилот · само обучение"}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[de ? "Fakten vor Meinungen" : "Факти преди мнения", de ? "Deterministische Berechnungen" : "Детерминистични изчисления", de ? "Deine Entscheidung bleibt deine" : "Решението остава твое"].map((item) => <div key={item} className="rounded-md bg-muted/60 p-4 text-sm font-medium">{item}</div>)}
          </div>
        </header>

        {contextLesson && contextLesson.slug !== selected?.slug && <section className="mt-5 rounded-md border border-primary/20 bg-primary/[0.04] p-5" aria-labelledby="context-lesson-title">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Nächste sinnvolle Lerneinheit" : "Следващ полезен урок"}</p><h2 id="context-lesson-title" className="mt-1 text-lg font-semibold"><BrandText text={contextLesson.title} /></h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{de ? "Ausgewählt anhand der vorhandenen Daten; fehlende Werte werden nicht angenommen." : "Избран според наличните данни; липсващите стойности не се предполагат."}</p><button type="button" onClick={() => setSelectedSlug(contextLesson.slug)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{de ? "Lerneinheit öffnen" : "Отвори урока"} <ArrowRight className="size-4" /></button></div></div>
        </section>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-md border border-border bg-card p-4" aria-label={de ? "Lerneinheiten" : "Уроци"}>
            <div className="flex items-center gap-2 px-2"><BookOpen className="size-4 text-primary" /><h2 className="text-sm font-semibold">{de ? "Lerneinheiten" : "Уроци"}</h2></div>
            <div className="mt-4 grid gap-2">{lessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => setSelectedSlug(lesson.slug)} className={`rounded-md p-3 text-left transition-colors ${lesson.slug === selected?.slug ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-primary/10"}`}><span className="block text-[11px] font-semibold uppercase tracking-wide opacity-75"><BrandText text={lesson.category} /></span><span className="mt-1 block text-sm font-medium"><BrandText text={lesson.title} /></span></button>)}</div>
          </aside>
          <article className="rounded-md border border-border bg-card p-6 sm:p-8">{selected ? <><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{levelLabel(selected.level, de)}</span><span className="text-xs text-muted-foreground"><BrandText text={selected.category} /></span></div><h2 className="mt-4 text-2xl font-semibold tracking-tight"><BrandText text={selected.title} /></h2><p className="mt-3 text-base font-medium leading-7 text-muted-foreground"><BrandText text={selected.summary} /></p><p className="mt-6 whitespace-pre-line text-sm leading-7 text-foreground"><BrandText text={selected.content} /></p><div className="mt-7 flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{selected.source_reference ?? (de ? "Pilot-Lerntext; keine individuelle Finanzberatung." : "Пилотно образователно съдържание; не е финансов съвет.")}</span></div></> : <p className="text-sm text-muted-foreground">{de ? "Es sind noch keine Lerneinheiten verfügbar." : "Все още няма налични уроци."}</p>}</article>
        </div>

        <section className="mt-6 rounded-md border border-border bg-muted/40 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{de ? "Hinweis" : "Забележка"}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{de ? "Diese Lerneinheiten werden fortlaufend erweitert. Sie sind allgemein gehalten und ersetzen keine individuelle Finanz-, Steuer- oder Rechtsberatung." : "Тези уроци се разширяват постепенно. Те са с общ характер и не заменят индивидуална финансова, данъчна или правна консултация."}</p><Link href={localizedPath("/dashboard", locale)} className="mt-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline">{de ? "Zurück zur Übersicht" : "Към таблото"} <ArrowRight className="size-4" /></Link></section>
      </div>
    </WorkspacePage>
  )
}

"use client"

import { useMemo, useState } from "react"
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react"
import Link from "next/link"

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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">KintexBG · Finanzbildung</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{de ? "Verstehen, bevor du entscheidest" : "Разбери финансите си, преди да решаваш"}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{de ? "Kurze, quellengebundene Lernschritte direkt aus deinem Finanz-Workflow. Keine Produktwerbung und keine automatische Empfehlung." : "Кратки, проверими уроци, свързани с реалния ти финансов workflow. Без продуктова реклама и без автоматични препоръки."}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary"><LockKeyhole className="size-3.5" /> {de ? "Pilot · Education only" : "Пилот · само обучение"}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[de ? "Facts before opinions" : "Факти преди мнения", de ? "Deterministic calculations" : "Детерминистични изчисления", de ? "Your decision remains yours" : "Решението остава твое"].map((item) => <div key={item} className="rounded-2xl bg-muted/60 p-4 text-sm font-medium">{item}</div>)}
          </div>
        </header>

        {contextLesson && <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-5" aria-labelledby="context-lesson-title">
          <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Next useful lesson" : "Следващ полезен урок"}</p><h2 id="context-lesson-title" className="mt-1 text-lg font-semibold">{contextLesson.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{de ? "Избран според наличните данни; липсващите стойности не се предполагат." : "Избран според наличните данни; липсващите стойности не се предполагат."}</p><button type="button" onClick={() => setSelectedSlug(contextLesson.slug)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{de ? "Open lesson" : "Отвори урока"} <ArrowRight className="size-4" /></button></div></div>
        </section>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card p-4" aria-label={de ? "Lessons" : "Уроци"}>
            <div className="flex items-center gap-2 px-2"><BookOpen className="size-4 text-primary" /><h2 className="font-semibold">{de ? "Lessons" : "Уроци"}</h2></div>
            <div className="mt-4 grid gap-2">{lessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => setSelectedSlug(lesson.slug)} className={`rounded-xl p-3 text-left transition-colors ${lesson.slug === selected?.slug ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-primary/10"}`}><span className="block text-[11px] font-semibold uppercase tracking-wide opacity-75">{lesson.category}</span><span className="mt-1 block text-sm font-medium">{lesson.title}</span></button>)}</div>
          </aside>
          <article className="rounded-2xl border border-border bg-card p-6 sm:p-8">{selected ? <><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{selected.level}</span><span className="text-xs text-muted-foreground">{selected.category}</span></div><h2 className="mt-4 text-2xl font-semibold tracking-tight">{selected.title}</h2><p className="mt-3 text-base font-medium leading-7 text-muted-foreground">{selected.summary}</p><p className="mt-6 whitespace-pre-line text-sm leading-7 text-foreground">{selected.content}</p><div className="mt-7 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{selected.source_reference ?? (de ? "Educational pilot content; not financial advice." : "Пилотно образователно съдържание; не е финансов съвет.")}</span></div></> : <p className="text-sm text-muted-foreground">{de ? "No lessons are available yet." : "Все още няма налични уроци."}</p>}</article>
        </div>

        <section className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">VZGcapital · {de ? "future extension" : "бъдещо разширение"}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{de ? "This pilot stores versioned lessons only. Future assets, liabilities, goals, scenarios and portfolio views will require explicit provenance and separate compliance review." : "Този пилот съхранява само versioned уроци. Бъдещи assets, liabilities, цели, сценарии и portfolio изгледи ще изискват provenance за всеки факт и отделен compliance review."}</p><Link href="/dashboard" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{de ? "Back to dashboard" : "Към Dashboard"} <ArrowRight className="size-4" /></Link></section>
      </div>
    </main>
  )
}

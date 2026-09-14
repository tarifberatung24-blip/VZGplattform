"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { isKintexWorkspacePath } from "@/lib/kintex-navigation"
import { useLanguage } from "@/lib/i18n/language-context"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"

const translations: Record<string, { title: string; description: string; items: string[] }> = {
  "Ansprüche prüfen": { title: "Проверка на помощи", description: "Провери структурирано дали държавните помощи съответстват на твоята житейска ситуация.", items: ["Опиши домакинството и жилищната ситуация", "Въведи доходите и текущите разходи", "Провери Kindergeld, Wohngeld и други помощи", "Получи следващи стъпки и нужните документи"] },
  "Über KintexBG": { title: "За KintexBG", description: "KintexBG ти помага да разбереш по-ясно финансовата си ситуация и да действаш подготвено.", items: ["Ясна ориентация вместо неструктурирана информация", "Постепенни проверки с разбираеми резултати", "Пестелива обработка на личните ти данни", "Указания кога професионалната консултация е полезна"] },
  "Unsere Leistungen": { title: "Нашите услуги", description: "Заяви конкретна оферта и получи ръчно проверен отговор.", items: ["Ток и газ: данни от Jahresabrechnung, PLZ и потребление", "Kfz: данни за автомобила, SF клас и желано покритие", "Кредит и SCHUFA: ясна предварителна подготовка без обещание за одобрение", "n8n workflow подрежда заявката за ръчна обработка до 2 часа"] },
  "Verträge prüfen": { title: "Проверка на договори", description: "Направи текущите разходи и възможните спестявания по договорите си видими.", items: ["Въведи договорите и доставчиците", "Направи месечните разходи видими", "Маркирай срокове и срокове за прекратяване", "Запази възможните спестявания като следващи стъпки"] },
  "Verträge & Tarife": { title: "Договори и тарифи", description: "Разбери текущите си договори и сравнявай възможности едва когато данните са достатъчно пълни.", items: ["Разграничи Haftpflicht, Teilkasko и Vollkasko", "Разбери SF-класата и самоучастието", "Провери срокове и срокове за прекратяване", "Стартирай сравнение само при достатъчна база данни"] },
  Dokumente: { title: "Документи", description: "Организирай важните документи като основа за оферта, тарифа или услуга.", items: ["Съхрани нужните документи защитено", "Подреди ги по тема: тарифа, застраховка, кредит или услуга", "Използвай ги за ръчна проверка без автоматично решение", "Бъди готов за следващата стъпка в клиентския панел"] },
}

export function FinanceModulePage({ title, description, items }: { title: string; description: string; items: string[] }) {
  const pathname = usePathname()
  const { locale } = useLanguage()
  const translated = locale === "bg" ? translations[title] : undefined
  const displayTitle = translated?.title ?? title
  const displayDescription = translated?.description ?? description
  const displayItems = translated?.items ?? items
  const labels = locale === "bg" ? { back: "Към началото", area: "Личен финансов раздел", secure: "Сигурен работен раздел", steps: "Провери стъпките си спокойно.", start: "Започни проверката", dashboard: "Към таблото", expected: "Какво ще направиш", notice: "Това е структурирана предварителна проверка.", disclaimer: "KintexBG не заменя данъчна или правна консултация." } : { back: "Zur Startseite", area: "Persönlicher Finanzbereich", secure: "Sicherer Arbeitsbereich", steps: "Prüfe deine nächsten Schritte in Ruhe.", start: "Prüfung starten", dashboard: "Zum Dashboard", expected: "Was dich erwartet", notice: "Dies ist eine strukturierte Vorprüfung.", disclaimer: "KintexBG ersetzt keine Steuer- oder Rechtsberatung." }
  if (isKintexWorkspacePath(pathname)) return (
    <section className="mx-auto max-w-4xl px-5 pb-14 pt-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">KintexBG</p>
      <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{displayTitle}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{displayDescription}</p>
    </section>
  )
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> {labels.back}</Link>
        <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card shadow-[0_16px_40px_rgb(21_21_21_/_0.06)]">
          <div className="border-b border-border bg-secondary/40 p-7 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">KintexBG · BY VZG CONSULT · {labels.area}</p><span className="inline-flex items-center gap-2 border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> {labels.secure}</span></div>
            <h1 className="mt-5 max-w-2xl text-balance text-3xl font-bold tracking-tight text-ring md:text-5xl">{displayTitle}</h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">{displayDescription}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{labels.steps}</p>
            <div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link href="/auth/sign-up">{labels.start} <ArrowRight data-icon="inline-end" /></Link></Button><Button asChild variant="outline"><Link href="/protected">{labels.dashboard}</Link></Button></div>
          </div>
          <div className="p-7 md:p-10"><h2 className="text-xl font-semibold text-foreground">{labels.expected}</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{displayItems.map((item, index) => <div key={item} className="flex items-start gap-3 rounded-md border border-border bg-background p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><div><CheckCircle2 className="mb-2 size-4 text-primary" /><span className="text-sm leading-6 text-foreground">{item}</span></div></div>)}</div><div className="mt-7 flex items-start gap-3 rounded-md border border-border bg-muted/60 p-4 text-sm leading-6 text-muted-foreground"><CircleAlert className="mt-0.5 size-5 shrink-0" /><span>{labels.notice} {labels.disclaimer}</span></div></div>
        </div>
      </div>
    </main>
  )
}

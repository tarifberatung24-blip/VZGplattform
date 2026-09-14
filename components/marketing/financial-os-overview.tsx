"use client"

import Link from "next/link"
import { ArrowRight, CalendarClock, FileCheck2, PiggyBank, Sparkles } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

const overview = [
  { key: "save", icon: PiggyBank, href: "/zayavka?service=energy", label: "Пари за спестяване", description: "Заявка за по-добра тарифа с ръчна проверка до 2 часа.", tone: "bg-primary/10 text-primary" },
  { key: "claim", icon: Sparkles, href: "/anspruch", label: "Пари за получаване", description: "Провери данъчни връщания и възможни помощи.", tone: "bg-success/10 text-success" },
  { key: "deadlines", icon: CalendarClock, href: "/vertraege", label: "Срокове за действие", description: "Не изпускай Kündigung, заявления и важни дати.", tone: "bg-accent text-accent-foreground" },
  { key: "documents", icon: FileCheck2, href: "/documents", label: "Документи за подготовка", description: "Знай какво ти трябва преди всяко заявление.", tone: "bg-secondary text-secondary-foreground" },
] as const

export function FinancialOsOverview() {
  const { locale } = useLanguage()
  const localizedHref = (href: string) => `/${locale}${href}`
  return (
    <section className="kintex-marketing-section border-y bg-card" aria-labelledby="financial-os-title">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8 md:py-20">
        <div className="max-w-2xl">
          <h2 id="financial-os-title" className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">Твоят финансов и административен помощник в Германия.</h2>
          <p className="mt-4 max-w-xl text-pretty leading-7 text-muted-foreground">Една ясна картина на парите за спестяване, парите за получаване, сроковете и документите, които са важни за теб.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overview.map(({ icon: Icon, href, label, description, tone }) => (
            <Link key={href} href={localizedHref(href)} className="kintex-marketing-item group p-5">
              <span className={`inline-flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" /></span>
              <h3 className="mt-5 font-semibold text-foreground">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">Разгледай <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

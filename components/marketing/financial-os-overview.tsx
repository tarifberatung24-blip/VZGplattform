"use client"

import Link from "next/link"
import { ArrowRight, CalendarClock, FileCheck2, PiggyBank, Sparkles } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

const overview = [
  { key: "save", icon: PiggyBank, href: "/zayavka?service=energy", label: "Пари за спестяване", description: "Заявка за по-добра тарифа с ръчна проверка до 2 часа." },
  { key: "claim", icon: Sparkles, href: "/anspruch", label: "Пари за получаване", description: "Провери данъчни връщания и възможни помощи." },
  { key: "deadlines", icon: CalendarClock, href: "/vertraege", label: "Срокове за действие", description: "Не изпускай Kündigung, заявления и важни дати." },
  { key: "documents", icon: FileCheck2, href: "/documents", label: "Документи за подготовка", description: "Знай какво ти трябва преди всяко заявление." },
] as const

export function FinancialOsOverview() {
  const { locale } = useLanguage()
  const localizedHref = (href: string) => `/${locale}${href}`
  return (
    <section className="kintex-marketing-section border-y bg-card" aria-labelledby="financial-os-title">
      <div className="mx-auto max-w-[1440px] px-5 py-24 lg:px-8 md:py-28">
        <div className="max-w-3xl">
          <h2 id="financial-os-title" className="text-balance text-4xl font-black tracking-[-0.04em] text-foreground md:text-5xl">Твоят финансов и административен помощник в Германия.</h2>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">Една ясна картина на парите за спестяване, парите за получаване, сроковете и документите, които са важни за теб.</p>
        </div>
        <div className="mt-14 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {overview.map(({ icon: Icon, href, label, description }) => (
            <Link key={href} href={localizedHref(href)} className="group bg-card p-8 transition-colors hover:bg-secondary">
              <span className="inline-flex size-10 items-center justify-center border border-border text-primary"><Icon aria-hidden="true" /></span>
              <h3 className="mt-8 font-bold text-foreground">{label}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
              <span className="mt-8 inline-flex items-center gap-1 text-sm font-bold text-primary">Разгледай <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

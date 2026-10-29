"use client"

import Link from "next/link"
import { BookOpen, CreditCard, FileSignature, type LucideIcon } from "lucide-react"

import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

type QuickEntry = {
  id: string
  href: string
  Icon: LucideIcon
  title: { bg: string; de: string }
  detail: { bg: string; de: string }
}

/**
 * The three read-and-prepare services, surfaced on the dashboard.
 *
 * They are public destinations (a letter, a guide, the SCHUFA help) rather than
 * case modules, so they live in their own strip instead of the module grid. On a
 * phone the strip is a horizontal row of tall tap targets, which keeps all three
 * reachable with one thumb and without opening a menu; from `sm` up it becomes a
 * grid. The order is the order a person reaches for them: a letter to send, a
 * guide to understand, the SCHUFA plan to repair.
 */
const quickEntries: readonly QuickEntry[] = [
  {
    id: "vorlagen",
    href: "/vorlagen",
    Icon: FileSignature,
    title: { bg: "Готови писма", de: "Fertige Briefe" },
    detail: { bg: "Попълни и изтегли готово немско писмо", de: "Fertigen deutschen Brief ausfüllen und laden" },
  },
  {
    id: "ratgeber",
    href: "/ratgeber",
    Icon: BookOpen,
    title: { bg: "Наръчник", de: "Ratgeber" },
    detail: { bg: "Служби, стъпки и документи накратко", de: "Behörden, Schritte und Unterlagen kurz erklärt" },
  },
  {
    id: "schufa",
    href: "/schufa",
    Icon: CreditCard,
    title: { bg: "Шуфа помощ", de: "SCHUFA-Hilfe" },
    detail: { bg: "Безплатна справка и план за подобрение", de: "Kostenlose Auskunft und Plan zur Verbesserung" },
  },
]

export function QuickServices() {
  const { locale } = useLanguage()
  const de = locale === "de"

  return (
    <section className="mt-5" aria-labelledby="horizon-quick-services">
      <h2 id="horizon-quick-services" className="text-lg font-semibold tracking-tight">
        {de ? "Schnellzugriff" : "Бърз достъп"}
      </h2>
      <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {quickEntries.map(({ id, href, Icon, title, detail }) => (
          <Link
            key={id}
            href={localizedPath(href, locale)}
            className="paper paper-link flex min-w-[15rem] shrink-0 snap-start flex-col items-start gap-3 p-4 sm:min-w-0"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="block">
              <span className="block text-sm font-semibold leading-snug">{title[locale]}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail[locale]}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

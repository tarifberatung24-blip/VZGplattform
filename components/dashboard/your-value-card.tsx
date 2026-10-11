"use client"

import Link from "next/link"
import { CalendarClock, PiggyBank, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { formatMoney, formatShortDate } from "@/lib/dashboard/contracts-data"
import type { YourValue } from "@/lib/value/your-value"
import type { GrundversorgungMatch } from "@/lib/value/grundversorgung"
import { BrandText } from "@/components/brand/horizon-wordmark"

export type YourValueCardProps = {
  value: YourValue
  grundversorgung: GrundversorgungMatch[]
}

/**
 * "Your value" on the dashboard: upcoming deadlines HORIZON watches, evidenced
 * savings, and the Grundversorgungs-Check. Every number comes from confirmed
 * data; a saving appears only after a confirmed switch to a lower price.
 */
export function YourValueCard({ value, grundversorgung }: YourValueCardProps) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const money = (amount: number) => formatMoney(amount, locale)
  const nextDate = formatShortDate(value.nextDeadline, locale)

  const metrics = [
    {
      icon: CalendarClock,
      label: de ? "Fristen in den nächsten 90 Tagen" : "Срокове в следващите 90 дни",
      value: String(value.upcomingDeadlines),
      note: nextDate ? (de ? `Nächste Frist: ${nextDate}` : `Най-близък срок: ${nextDate}`) : de ? "Noch keine Frist erfasst" : "Още няма записан срок",
    },
    {
      icon: PiggyBank,
      label: de ? "Gesicherte Ersparnis pro Jahr" : "Осигурено спестяване годишно",
      value: value.securedAnnualSavings + value.realizedAnnualSavings > 0 ? money(value.securedAnnualSavings + value.realizedAnnualSavings) : "–",
      note: value.realizedAnnualSavings > 0
        ? de ? `Davon schon wirksam: ${money(value.realizedAnnualSavings)}` : `От тях вече в сила: ${money(value.realizedAnnualSavings)}`
        : de ? "Erscheint, sobald ein Wechsel zu einem niedrigeren Preis bestätigt ist." : "Показва се, когато смяна към по-ниска цена е потвърдена.",
    },
  ]

  return <section className="mt-6 rounded-md border border-border bg-card p-5 shadow-none" aria-labelledby="your-value-title">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{de ? "Dein Nutzen" : "Твоята стойност"}</p>
    <h2 id="your-value-title" className="mt-1 text-xl font-semibold tracking-tight"><BrandText text={de ? "Was HORIZON für dich im Blick behält" : "Какво HORIZON следи за теб"} /></h2>

    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {metrics.map(({ icon: Icon, label, value: metric, note }) => <article key={label} className="rounded-md border border-border bg-background p-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary/5 text-primary"><Icon className="size-5" /></span><p className="text-sm font-medium text-muted-foreground">{label}</p></div>
        <p className="mt-4 text-2xl font-semibold tracking-tight">{metric}</p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </article>)}
    </div>

    {grundversorgung.length > 0
      ? <div className="mt-4 space-y-3">
        {grundversorgung.map((match) => <div key={match.id} className="rounded-md border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Zap className="size-5" /></span>
            <div className="min-w-0">
              <p className="font-semibold">{de
                ? `„${match.title}“ läuft in der Grundversorgung`
                : `„${match.title}“ е на Grundversorgung`}</p>
              <p className="mt-1 text-sm text-muted-foreground">{de
                ? `Die Grundversorgung gehört meist zu den teuersten ${match.category === "gas" ? "Gastarifen" : "Stromtarifen"}. Du kannst sie mit zwei Wochen Frist kündigen. Ein echtes Angebot zeigt dir, was du bei einem anderen Anbieter zahlen würdest.`
                : `Grundversorgung обикновено е сред най-скъпите тарифи за ${match.category === "gas" ? "газ" : "ток"}. Можеш да го прекратиш с две седмици предизвестие. С реална оферта ще видиш колко би плащал при друг доставчик.`}</p>
              <Button asChild size="sm" className="mt-3"><Link href={`${localizedPath("/vertraege", locale)}?optimize=${encodeURIComponent(match.id)}`}>{de ? "Günstigeren Tarif prüfen" : "Провери по-евтин тариф"}</Link></Button>
            </div>
          </div>
        </div>)}
      </div>
      : <p className="mt-4 text-sm text-muted-foreground">{de
        ? "Steht auf deiner Strom- oder Gasrechnung „Grundversorgung“? Lade die Rechnung hoch, dann erkennen wir das und zeigen dir, wo du sparen kannst."
        : "На сметката ти за ток или газ пише ли „Grundversorgung“? Качи сметката и ще го разпознаем, а после ще ти покажем къде можеш да спестиш."}{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href={localizedPath("/vertraege", locale)}>{de ? "Rechnung hochladen" : "Качи сметка"}</Link>
      </p>}

    <p className="mt-4 text-xs text-muted-foreground">{de
      ? "Nur bestätigte Daten. Eine Ersparnis zeigen wir erst, wenn der Wechsel zu einem niedrigeren Preis bestätigt ist."
      : "Само потвърдени данни. Спестяване показваме едва когато смяната към по-ниска цена е потвърдена."}</p>
  </section>
}

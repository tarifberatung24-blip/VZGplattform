"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, MessageSquareText, SearchCheck, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

type Props = {
  firstName?: string | null
  nextAction: { href: string; label: string }
}

export function WorkplaceActionCenter({ firstName, nextAction }: Props) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const intakeOptions = de
    ? [
        { href: "/documents", label: "Ich habe ein Schreiben erhalten und verstehe es nicht", icon: MessageSquareText },
        { href: "/anspruch", label: "Ich möchte eine Leistung oder einen Anspruch prüfen", icon: SearchCheck },
        { href: "/finanzbildung", label: "Ich möchte meine Finanzen besser verstehen", icon: BookOpen },
      ]
    : [
        { href: "/documents", label: "Получих писмо и не го разбирам", icon: MessageSquareText },
        { href: "/anspruch", label: "Искам да проверя помощ или право", icon: SearchCheck },
        { href: "/finanzbildung", label: "Искам да разбера финансите си", icon: BookOpen },
      ]

  return (
    <section className="mt-6" aria-labelledby="action-center-title">
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{de ? "Nächste Schritte" : "Следващи стъпки"}</p>
            <h2 id="action-center-title" className="mt-2 text-2xl font-semibold tracking-tight">{de ? (firstName ? `${firstName}, was möchtest du erledigen?` : "Was möchtest du erledigen?") : (firstName ? `${firstName}, какво трябва да свършим?` : "Какво трябва да свършим?")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{de ? "Ein klarer Weg vom Schreiben oder Problem zum geprüften Dokument und nächsten Schritt." : "Един ясен път от писмо или проблем до проверен документ и следваща стъпка."}</p>
          </div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">{de ? "Kein automatischer Versand" : "Без автоматично изпращане"}</span>
        </div>
        <div className="mt-5 rounded-xl border border-primary/15 bg-background p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{de ? "Nächster Schritt" : "Следваща стъпка"}</p><p className="mt-1 font-semibold text-foreground">{nextAction.label}</p><Button asChild size="sm" variant="outline" className="mt-3"><Link href={nextAction.href}>{de ? "Weiter" : "Продължи"} <ArrowRight className="size-4" /></Link></Button></div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {intakeOptions.map(({ href, label, icon: Icon }) => <Link key={label} href={href} className="group rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"><Icon className="size-4 text-primary" aria-hidden="true" /><span className="mt-2 block text-sm font-medium leading-5">{label}</span><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">{de ? "Starten" : "Започни"} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" /></span></Link>)}
        </div>
        {/* The counts this card used to repeat are already the metric tiles above; only the
            confirmation promise is not shown anywhere else on the page. */}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">{de ? "Wichtige Fakten werden von dir bestätigt, bevor ein Entwurf exportiert oder versendet wird." : "Критичните факти се потвърждават от теб преди чернова, export или изпращане."}</p>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

type Props = {
  nextAction: { href: string; label: string }
}

/**
 * The single "what should I do next" banner.
 *
 * The dashboard previously offered three competing entry systems (the guide
 * header button, the module grid and an intake-option grid here), which left the
 * user without one obvious next step. This banner carries the one live,
 * state-derived recommendation; the module grid below is the only "start
 * something" surface.
 */
export function WorkplaceActionCenter({ nextAction }: Props) {
  const { locale } = useLanguage()
  const de = locale === "de"

  return (
    <section className="mt-6" aria-labelledby="action-center-title">
      <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {de ? "Nächster Schritt" : "Следваща стъпка"}
            </p>
            <h2 id="action-center-title" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {nextAction.label}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {de
                ? "Ein klarer Weg vom Schreiben oder Problem zum geprüften Dokument und nächsten Schritt."
                : "Един ясен път от писмо или проблем до проверен документ и следваща стъпка."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {de ? "Kein automatischer Versand" : "Без автоматично изпращане"}
          </span>
        </div>
        <Button asChild className="mt-5">
          <Link href={nextAction.href}>
            {de ? "Weiter" : "Продължи"} <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {de
            ? "Wichtige Fakten werden von dir bestätigt, bevor ein Entwurf exportiert oder versendet wird."
            : "Критичните факти се потвърждават от теб преди чернова, export или изпращане."}
        </p>
      </div>
    </section>
  )
}

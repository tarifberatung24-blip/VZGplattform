"use client"

import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function LegalBanner() {
  const { locale } = useLanguage()
  const copy = locale === "de"
    ? "Information und Vorbereitung – keine Steuer-, Rechts- oder Versicherungsberatung. Entscheidungen triffst du selbst."
    : "Информация и подготовка — не данъчна, правна или застрахователна консултация. Решенията са твои."
  return <div className="border-b border-primary/20 bg-primary/5"><div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />{copy}</div></div>
}

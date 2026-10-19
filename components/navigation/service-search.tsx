"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { localizedPath } from "@/lib/i18n/routing"
import { cn } from "@/lib/utils"

type ServiceSearchProps = {
  compact?: boolean
  className?: string
}

type Service = {
  href: string
  title: string
  detail: string
  terms: string
}

/**
 * One short route finder for the whole product. It searches real destinations
 * only; each result is an existing, authenticated workspace service.
 */
export function ServiceSearch({ compact = false, className }: ServiceSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname() ?? "/"
  const locale = pathname.startsWith("/de") ? "de" : "bg"
  const de = locale === "de"

  const copy = de
    ? {
        trigger: "Dienst suchen",
        title: "Wohin möchtest du?",
        hint: "Suche nach einem Dienst oder Thema.",
        placeholder: "Zum Beispiel Inkasso, Dokumente oder Vertrag",
        empty: "Kein passender Dienst gefunden.",
      }
    : {
        trigger: "Търси услуга",
        title: "Какво търсиш?",
        hint: "Намери услуга или тема.",
        placeholder: "Например Inkasso, документи или договор",
        empty: "Няма намерена подходяща услуга.",
      }

  const services: readonly Service[] = de
    ? [
        { href: "/dashboard", title: "Übersicht", detail: "Deine wichtigsten Dienste", terms: "dashboard start home" },
        { href: "/guide", title: "HORIZON Guide", detail: "Hilfe für einen persönlichen Vorgang", terms: "hilfe fall brief antwort frist" },
        { href: "/pruefung", title: "Inkasso-Check", detail: "Ein Inkasso- oder Mahnschreiben prüfen", terms: "inkasso mahnung mahnbescheid forderung gläubiger" },
        { href: "/documents", title: "Dokumente", detail: "Briefe und Unterlagen verwalten", terms: "brief hochladen dokument pdf" },
        { href: "/vertraege", title: "Verträge", detail: "Verträge und Fristen", terms: "vertrag kündigung kosten" },
        { href: "/steuer", title: "Steuern", detail: "Steuerunterlagen vorbereiten", terms: "steuer steuererklärung finanzamt" },
        { href: "/forum", title: "HORIZON Forum", detail: "Fragen und Erfahrungen teilen", terms: "forum frage meinung thema" },
        { href: "/finanzbildung", title: "Finanzbildung", detail: "Grundlagen verständlich erklärt", terms: "lernen wissen finanzen" },
        { href: "/profil", title: "Profil", detail: "Angaben und Einstellungen", terms: "konto einstellungen datenschutz" },
      ]
    : [
        { href: "/dashboard", title: "Начало", detail: "Най-важните ти услуги", terms: "табло dashboard начало" },
        { href: "/guide", title: "HORIZON Guide", detail: "Помощ за личен случай", terms: "помощ случай писмо отговор срок" },
        { href: "/pruefung", title: "Inkasso Check", detail: "Провери писмо за Inkasso или Mahnbescheid", terms: "инкассо inkasso писмо mahnung mahnbescheid вземане" },
        { href: "/documents", title: "Документи", detail: "Управлявай писма и документи", terms: "писмо качи документ pdf" },
        { href: "/vertraege", title: "Договори", detail: "Договори и срокове", terms: "договор прекратяване разходи" },
        { href: "/steuer", title: "Данъци", detail: "Подготви данъчни документи", terms: "данък декларация finanzamt" },
        { href: "/forum", title: "HORIZON Forum", detail: "Въпроси и опит от общността", terms: "форум мнение въпрос тема" },
        { href: "/finanzbildung", title: "Финансово обучение", detail: "Разбери основите спокойно", terms: "учене знания финанси" },
        { href: "/profil", title: "Профил", detail: "Данни и настройки", terms: "акаунт настройки поверителност" },
      ]

  const term = query.trim().toLocaleLowerCase(locale)
  const results = term
    ? services.filter((service) =>
        `${service.title} ${service.detail} ${service.terms}`.toLocaleLowerCase(locale).includes(term),
      )
    : services

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "inline-flex size-11 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            : "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          className,
        )}
        aria-label={copy.trigger}
      >
        <Search className={compact ? "size-6" : "size-4"} aria-hidden="true" />
        {compact ? null : <span>{copy.trigger}</span>}
      </button>

      <DialogContent className="max-h-[min(42rem,calc(100svh-2rem))] overflow-y-auto p-5 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg">{copy.title}</DialogTitle>
          <DialogDescription>{copy.hint}</DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="space-y-2">
          {results.length ? results.map((service) => (
            <Link
              key={service.href}
              href={localizedPath(service.href, locale)}
              onClick={() => {
                setOpen(false)
                setQuery("")
              }}
              className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-secondary"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{service.title}</span>
                <span className="block text-xs text-muted-foreground">{service.detail}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
            </Link>
          )) : <p className="py-6 text-center text-sm text-muted-foreground">{copy.empty}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

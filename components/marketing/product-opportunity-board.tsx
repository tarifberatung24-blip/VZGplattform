"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Check, ChevronRight, CircleDollarSign, FileSearch, Gauge, Lightbulb, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n/language-context"

type Product = {
  id: string
  label: string
  title: string
  description: string
  icon: typeof Lightbulb
  accent: string
  eyebrow: string
  detail: string[]
  action: string
  href: string
}

const products: Product[] = [
  {
    id: "strom",
    label: "Strom & Gas",
    title: "Energiekosten im Blick",
    description: "Vergleiche deinen aktuellen Strom- oder Gasvertrag mit passenden Tarifen.",
    icon: Lightbulb,
    accent: "bg-[#2563eb]/15 text-[#2563eb]",
    eyebrow: "Mögliche monatliche Optimierung",
    detail: ["Verbrauch strukturiert erfassen", "Preis und Laufzeit vergleichen", "Wechsel transparent vorbereiten"],
    action: "Angebot bis 2 Std. anfragen",
    href: "/zayavka?service=energy",
  },
  {
    id: "schufa",
    label: "SCHUFA",
    title: "Bonität verstehen",
    description: "Prüfe deine Bonitätsdaten, bevor du einen wichtigen Vertrag oder Kredit beantragst.",
    icon: FileSearch,
    accent: "bg-[#2563eb]/15 text-[#2563eb]",
    eyebrow: "Bonitätscheck",
    detail: ["Passende Auskunft auswählen", "Daten beim Partner prüfen", "Für Miet- oder Kreditpläne vorbereitet sein"],
    action: "SCHUFA Anfrage starten",
    href: "/zayavka?service=schufa",
  },
  {
    id: "versicherungen",
    label: "Kfz-Versicherung",
    title: "Kfz-Schutz vergleichen",
    description: "Prüfe Beitrag, Deckung und Selbstbeteiligung für dein Fahrzeug.",
    icon: ShieldCheck,
    accent: "bg-slate-100 text-slate-700",
    eyebrow: "Partnervergleich",
    detail: ["HSN/TSN und SF-Klasse vorbereiten", "Deckung und Selbstbeteiligung prüfen", "Tarife beim Partner vergleichen"],
    action: "Kfz-Angebot anfragen",
    href: "/zayavka?service=kfz",
  },
  {
    id: "kredit",
    label: "Kredit",
    title: "Finanzierung mit Klarheit",
    description: "Bereite deine Finanzierungsfragen vor, bevor du Angebote vergleichst.",
    icon: CircleDollarSign,
    accent: "bg-blue-50 text-blue-700",
    eyebrow: "Partnervergleich",
    detail: ["Finanzierungsziel festhalten", "Rate und Laufzeit verstehen", "Angebote beim Partner vergleichen"],
    action: "Kredit-Anfrage vorbereiten",
    href: "/zayavka?service=credit",
  },
]

export function ProductOpportunityBoard() {
  const { locale } = useLanguage()
  const [activeId, setActiveId] = useState("strom")
  const active = products.find((product) => product.id === activeId) ?? products[0]
  const ActiveIcon = active.icon
  const localizedHref = (href: string) => `/${locale}${href}`

  return (
    <section className="relative overflow-hidden border-b border-border bg-background text-foreground" aria-labelledby="produkte-title">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-5 rounded-full border-blue-200 bg-card px-3 py-1 text-foreground shadow-sm">
            Dein Finanzradar
          </Badge>
          <h1 id="produkte-title" className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Finde die Hebel, die <span className="text-primary">wirklich zählen.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            KintexBG sammelt nur die Angaben, die fuer ein echtes Angebot gebraucht werden. Danach geht die Anfrage an den n8n Workflow und wird manuell bearbeitet.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" role="tablist" aria-label="Finanzbereiche">
            {products.map((product) => {
              const Icon = product.icon
              const isActive = product.id === active.id
              return (
                <button
                  key={product.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(product.id)}
                  className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${isActive ? "border-blue-300 bg-card shadow-sm" : "border-border bg-card hover:border-blue-300"}`}
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-sm ${product.accent}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{product.label}</span>
                    <span className="mt-1 block truncate text-sm text-muted-foreground">{product.title}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className={`size-4 shrink-0 text-primary transition-transform ${isActive ? "translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                </button>
              )
            })}
          </div>

          <div className="relative min-h-[430px] overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className={`flex size-14 items-center justify-center rounded-sm ${active.accent}`}>
                  <ActiveIcon aria-hidden="true" className="size-7" />
                </span>
                <Badge variant="default">2h Service-SLA</Badge>
              </div>
              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{active.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{active.title}</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{active.description}</p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {active.detail.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
                    <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                    <Link href={localizedHref(active.href)}>
                      {active.action}
                      <ArrowUpRight data-icon="inline-end" />
                    </Link>
                  </Button>
                <Link href={localizedHref("/documents")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Dokumente vorbereiten
                  <Gauge aria-hidden="true" className="size-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Keine automatische Entscheidung. Preise, Annahmen und Kreditentscheidungen werden erst nach individueller Prüfung bestätigt.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

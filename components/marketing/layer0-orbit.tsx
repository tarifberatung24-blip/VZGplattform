"use client"

import Link from "next/link"
import {
  BarChart3,
  BriefcaseBusiness,
  FileCheck2,
  FileText,
  HeartPulse,
  Scale,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

type OrbitItem = {
  id: string
  label: string
  description: string
  href: string
  position: string
  Icon: LucideIcon
}

const items: Record<"bg" | "de", OrbitItem[]> = {
  bg: [
    { id: "documents", label: "Документи", description: "Качи, подреди и разбери важните документи.", href: "/documents", position: "bottom", Icon: FileCheck2 },
    { id: "taxes", label: "Данъци", description: "Подготви следващата данъчна стъпка.", href: "/steuer", position: "top", Icon: FileText },
    { id: "tariffs", label: "Тарифи", description: "Сравни разходи, договори и възможности.", href: "/versicherungen", position: "top-right", Icon: BarChart3 },
    { id: "rights", label: "Права", description: "Ориентирай се в административните възможности.", href: "/anspruch", position: "right", Icon: Scale },
    { id: "kindergeld", label: "Kindergeld", description: "Подготви информацията за семейните помощи.", href: "/kindergeld", position: "bottom-right", Icon: HeartPulse },
    { id: "jobcenter", label: "Jobcenter", description: "Организирай документи и следващи стъпки.", href: "/guide", position: "bottom-left", Icon: BriefcaseBusiness },
    { id: "energy", label: "Енергия", description: "Събери данните за текущите разходи.", href: "/guide", position: "left", Icon: Zap },
    { id: "security", label: "Сигурност", description: "Разбери какво се случва с твоите данни.", href: "/security", position: "top-left", Icon: ShieldCheck },
    { id: "inkasso", label: "Inkasso", description: "Провери дали писмото от Inkasso е редно и какво да правиш.", href: "/guide", position: "upper-left", Icon: FileText },
  ],
  de: [
    { id: "documents", label: "Dokumente", description: "Wichtige Dokumente hochladen, ordnen und verstehen.", href: "/documents", position: "bottom", Icon: FileCheck2 },
    { id: "taxes", label: "Steuern", description: "Den nächsten Schritt für deine Steuer vorbereiten.", href: "/steuer", position: "top", Icon: FileText },
    { id: "tariffs", label: "Tarife", description: "Kosten, Verträge und Möglichkeiten vergleichen.", href: "/versicherungen", position: "top-right", Icon: BarChart3 },
    { id: "rights", label: "Ansprüche", description: "Dich in Verwaltungsfragen orientieren.", href: "/anspruch", position: "right", Icon: Scale },
    { id: "kindergeld", label: "Kindergeld", description: "Informationen für Familienleistungen vorbereiten.", href: "/kindergeld", position: "bottom-right", Icon: HeartPulse },
    { id: "jobcenter", label: "Jobcenter", description: "Unterlagen und nächste Schritte ordnen.", href: "/guide", position: "bottom-left", Icon: BriefcaseBusiness },
    { id: "energy", label: "Energie", description: "Daten zu deinen laufenden Kosten sammeln.", href: "/guide", position: "left", Icon: Zap },
    { id: "security", label: "Sicherheit", description: "Verstehen, wie deine Daten behandelt werden.", href: "/security", position: "top-left", Icon: ShieldCheck },
    { id: "inkasso", label: "Inkasso", description: "Prüfe, ob das Inkassoschreiben berechtigt ist und was du tun kannst.", href: "/guide", position: "upper-left", Icon: FileText },
  ],
}

const reviewedCopy: Record<"bg" | "de", Record<string, Pick<OrbitItem, "label" | "description" | "href">>> = {
  bg: {
    documents: { label: "Документи", description: "Съхранявай важни документи и ги подготвяй за ръчна проверка.", href: "/documents" },
    taxes: { label: "Данъчна декларация", description: "Събери данъчните данни, разходите и липсващите документи.", href: "/steuer" },
    tariffs: { label: "Договори", description: "Виж месечни разходи, срокове и възможни следващи стъпки.", href: "/vertraege" },
    rights: { label: "Държавни помощи", description: "Провери структурирано Kindergeld, Wohngeld и други помощи.", href: "/anspruch" },
    kindergeld: { label: "Kindergeld", description: "Подготви предварителна проверка на формулярите и нужните документи.", href: "/kindergeld" },
    jobcenter: { label: "Разбери ситуацията", description: "Избери дали да разбереш документ, да отговориш на институция или да попълниш форма.", href: "/guide" },
    energy: { label: "Финансово обучение", description: "Научи повече за решенията, договорите и разходите си.", href: "/finanzbildung" },
    security: { label: "Как работи", description: "Виж как HORIZON подготвя документи, срокове и следващи стъпки.", href: "/how-it-works" },
    inkasso: { label: "Inkasso писмо", description: "Отвори Guide и избери „Разбери документ“ за структурирана подготовка.", href: "/guide" },
  },
  de: {
    documents: { label: "Dokumente", description: "Wichtige Unterlagen speichern und für eine manuelle Prüfung vorbereiten.", href: "/documents" },
    taxes: { label: "Steuererklärung", description: "Steuerdaten, Ausgaben und fehlende Unterlagen zusammentragen.", href: "/steuer" },
    tariffs: { label: "Verträge", description: "Monatliche Kosten, Fristen und nächste Schritte im Blick behalten.", href: "/vertraege" },
    rights: { label: "Staatliche Hilfen", description: "Kindergeld, Wohngeld und weitere Leistungen strukturiert prüfen.", href: "/anspruch" },
    kindergeld: { label: "Kindergeld", description: "Formulare und benötigte Unterlagen für die Vorprüfung vorbereiten.", href: "/kindergeld" },
    jobcenter: { label: "Situation verstehen", description: "Dokument verstehen, Behörde antworten oder Formular vorbereiten.", href: "/guide" },
    energy: { label: "Finanzbildung", description: "Mehr über Entscheidungen, Verträge und laufende Kosten lernen.", href: "/finanzbildung" },
    security: { label: "So funktioniert es", description: "Sehen, wie HORIZON Dokumente, Fristen und nächste Schritte vorbereitet.", href: "/how-it-works" },
    inkasso: { label: "Inkassoschreiben", description: "Guide öffnen und „Dokument verstehen“ für die strukturierte Vorbereitung wählen.", href: "/guide" },
  },
}

const connectionTargets: Record<string, [number, number]> = {
  top: [50, 8],
  "top-right": [77, 18],
  right: [91, 43],
  "bottom-right": [86, 71],
  bottom: [64, 90],
  "bottom-left": [36, 90],
  left: [14, 71],
  "top-left": [9, 43],
  "upper-left": [23, 18],
}

export function Layer0Orbit() {
  const { locale } = useLanguage()
  const orbitItems = items[locale].map((item) => ({ ...item, ...reviewedCopy[locale][item.id] }))
  const [selectedId, setSelectedId] = useState("documents")
  const selected = orbitItems.find((item) => item.id === selectedId) ?? orbitItems[0]
  const selectedIndex = orbitItems.findIndex((item) => item.id === selected.id)
  const SelectedIcon = selected.Icon

  return (
    <section className="layer0-orbit" aria-label={locale === "de" ? "HORIZON Bereiche" : "HORIZON възможности"}>
      <div className="layer0-orbit__stage">
        <div className="layer0-orbit__halo" aria-hidden="true" />
        <div className="layer0-orbit__rings" aria-hidden="true"><span /><span /><span /></div>
        <svg className="layer0-orbit__connection" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="50" y1="50" x2={connectionTargets[selected.position][0]} y2={connectionTargets[selected.position][1]} />
          <circle cx={connectionTargets[selected.position][0]} cy={connectionTargets[selected.position][1]} r="1.15" />
        </svg>
        <div className="layer0-orbit__core" aria-label={locale === "de" ? "HORIZON Übersicht" : "Преглед на HORIZON"}>
          <span className="layer0-orbit__wordmark">Horizon</span>
        </div>

        <div className="layer0-orbit__nodes">
          {orbitItems.map(({ id, label, position }) => {
            const active = id === selected.id
            return (
              <button
                key={id}
                type="button"
                className={`layer0-orbit__node layer0-orbit__node--${position}${active ? " is-active" : ""}`}
                onClick={() => setSelectedId(id)}
                aria-pressed={active}
              >
                <span className="layer0-orbit__node-icon">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="layer0-orbit__card glass-card">
        <div className="flex items-start gap-3">
          <span className="layer0-orbit__card-icon"><SelectedIcon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--thread-glow)]">0{selectedIndex + 1} · {locale === "de" ? "Bereich" : "Възможност"}</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">{selected.label}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{selected.description}</p>
          </div>
        </div>
        <Link href={localizedPath(selected.href, locale)} className="layer0-orbit__card-link">
          {locale === "de" ? "Öffnen" : "Отвори"}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

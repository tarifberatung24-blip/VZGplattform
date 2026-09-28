"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Check, CircleAlert, FileUp, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function EntitlementNavigator() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [children, setChildren] = useState("")
  const [income, setIncome] = useState("")
  const [status, setStatus] = useState<"NEEDS_MORE_DATA" | "POSSIBLY_RELEVANT" | null>(null)
  const copy = de
    ? { title: "Nächsten Schritt prüfen", body: "Dies ist eine vorläufige Orientierung. Sie bestätigt keinen Anspruch auf eine bestimmte Leistung.", children: "Kinder im Haushalt", income: "Monatliches Nettoeinkommen", childrenPlaceholder: "z. B. 1", incomePlaceholder: "in €", submit: "Vorläufigen Status anzeigen", relevant: "Es gibt Anhaltspunkte, die passenden offiziellen Seiten und Unterlagen zu prüfen. Eine rechtliche Prüfung wurde nicht durchgeführt.", needMore: "Gib mindestens Kinder und Einkommen an, um mit einer aussagekräftigeren Orientierung fortzufahren." }
    : { title: "Провери следващата стъпка", body: "Това е предварителен ориентир. Не потвърждава право на конкретна помощ.", children: "Деца в домакинството", income: "Месечен нетен доход", childrenPlaceholder: "напр. 1", incomePlaceholder: "в €", submit: "Покажи предварителен статус", relevant: "Има основание да провериш подходящите официални страници и документи. Не е извършена правна проверка.", needMore: "Въведи поне деца и доход, за да продължиш с по-смислена предварителна ориентация." }
  return <section className="mt-10 rounded-sm border border-border bg-card p-8 shadow-none"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Entitlement Navigator</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground">{copy.title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.body}</p><div className="mt-8 grid gap-6 sm:grid-cols-2"><label className="text-sm font-bold text-foreground">{copy.children}<input className="mt-3 flex h-11 w-full rounded-sm border border-input bg-background px-3" inputMode="numeric" value={children} onChange={(event) => setChildren(event.target.value)} placeholder={copy.childrenPlaceholder} /></label><label className="text-sm font-bold text-foreground">{copy.income}<input className="mt-3 flex h-11 w-full rounded-sm border border-input bg-background px-3" inputMode="decimal" value={income} onChange={(event) => setIncome(event.target.value)} placeholder={copy.incomePlaceholder} /></label></div><Button className="mt-8" onClick={() => setStatus(children && income ? "POSSIBLY_RELEVANT" : "NEEDS_MORE_DATA")}>{copy.submit} <ArrowRight data-icon="inline-end" /></Button>{status && <div className="mt-8 rounded-sm border border-border bg-background p-5" role="status"><p className="font-bold text-foreground">{status}</p><p className="mt-2 text-sm leading-7 text-muted-foreground">{status === "POSSIBLY_RELEVANT" ? copy.relevant : copy.needMore}</p></div>}</section>
}

export function DocumentWorkspace() {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [fileName, setFileName] = useState("")
  return <section className="mt-10 rounded-sm border border-border bg-card p-8 shadow-none"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{de ? "Dokumente" : "Документи"}</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-foreground">{de ? "Dokumentenbereich" : "Документна зона"}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{de ? "Wähle eine Datei, um deinen Arbeitsordner vorzubereiten. OCR und automatische Extraktion sind NOT_CONFIGURED." : "Избери файл, за да подготвиш работната си папка. OCR и автоматично извличане са NOT_CONFIGURED."}</p><label className="mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-background p-10 text-center hover:border-primary"><FileUp className="size-7 text-primary" /><span className="font-bold text-foreground">{de ? "Dokument hinzufügen" : "Добави документ"}</span><span className="text-sm text-muted-foreground">{de ? "PDF, JPG oder PNG · die Datei wird nicht automatisch analysiert" : "PDF, JPG или PNG · файлът не се анализира автоматично"}</span><input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>{fileName && <div className="mt-5 flex items-center justify-between rounded-sm border border-border p-4 text-sm"><span className="truncate text-foreground">{fileName}</span><span className="shrink-0 text-xs font-bold text-primary">NOT_CONFIGURED</span></div>}<div className="mt-5 flex items-start gap-2 rounded-sm border border-border bg-background p-4 text-sm leading-7 text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0" />{de ? "Keine vorgetäuschte Analyse und kein extrahierter Inhalt. Für eine echte Speicherung ist eine Storage-Integration erforderlich." : "Няма фалшив анализ или извлечено съдържание. За реално съхранение е необходима Storage интеграция."}</div></section>
}

export function TariffWorkspace() {
  const { locale } = useLanguage()
  const de = locale === "de"
  return <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tarife</p><h2 className="mt-2 text-2xl font-semibold text-foreground">{de ? "Prüfung realer Angebote" : "Проверка на реални оферти"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{de ? "Partnerangebote öffnen sich bei einem externen Anbieter. HORIZON by VZG erfindet keine Tarife und verspricht keine Ersparnis." : "Партньорските предложения се отварят във външен доставчик. HORIZON by VZG не измисля тарифи и не обещава спестяване."}</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Button asChild><Link href="/produkte">{de ? "Vergleiche öffnen" : "Отвори сравненията"} <ArrowRight data-icon="inline-end" /></Link></Button><Button asChild variant="outline"><a href="https://www.check24.de/internet/" target="_blank" rel="sponsored noopener noreferrer">{de ? "Internet vergleichen" : "Сравни интернет"} <ExternalLink data-icon="inline-end" /></a></Button></div><p className="mt-4 text-xs text-muted-foreground">{de ? "Status: EXTERNAL_PROVIDER · falls das Widget nicht lädt, nutze den direkten Link." : "Статус: EXTERNAL_PROVIDER · ако widget-ът не зареди, използвай директната връзка."}</p></section>
}

export function ProgressChecklist({ items }: { items: string[] }) { return <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2">{items.map((item) => <div key={item} className="flex items-start gap-3 bg-card p-5"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span className="text-sm leading-7 text-foreground">{item}</span></div>)}</div> }

export function ModuleLink({ href, children }: { href: string; children: ReactNode }) { return <Button asChild variant="outline"><Link href={href}>{children}</Link></Button> }

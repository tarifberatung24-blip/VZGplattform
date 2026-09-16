"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"
import { kintexModules } from "@/lib/kintex-navigation"
import { getSmartDashboardNextAction, getSmartDashboardProblems, smartDashboardEnvironment, smartDashboardRules, type SmartDashboardStats } from "@/lib/kintex-smart-dashboard"

function RadarPanel({ stats, locale }: { stats: SmartDashboardStats; locale: "bg" | "de" }) {
  const de = locale === "de"
  const next = getSmartDashboardNextAction(stats, locale)
  const problems = getSmartDashboardProblems(stats)
  const rows = de ? [["Profil", `${stats.profileCompleteness}%`], ["Verträge", String(stats.contracts)], ["Dokumente", String(stats.documents)]] : [["Профил", `${stats.profileCompleteness}%`], ["Договори", String(stats.contracts)], ["Документи", String(stats.documents)]]
  return (
    <section className="mt-10 border-y border-border py-8" aria-labelledby="radar-title">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="nm-kicker">Kintex Radar</p>
          <h2 id="radar-title" className="mt-3 text-2xl font-semibold tracking-tight">{de ? "Systemstatus deines Home Office." : "Системен статус на твоя Home Office."}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{de ? "Radar nutzt nur gespeicherte Plattformdaten. Keine Angebote, keine Annahmen, keine automatische Entscheidung." : "Radar използва само записани данни в платформата. Без оферти, без предположения, без автоматично решение."}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{smartDashboardEnvironment.database} · {smartDashboardEnvironment.aiLayer} · {problems.length} open signal(s)</p>
        </div>
        <Button asChild className="justify-self-start lg:justify-self-end"><Link href={localizedPath(next.href, locale)}>{next.label}<ArrowRight aria-hidden="true" /></Link></Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{rows.map(([label, value]) => <div key={label} className="border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{value}</p></div>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">{Object.entries(smartDashboardRules).filter(([, enabled]) => enabled).slice(0, 4).map(([rule]) => <span key={rule} className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{rule}</span>)}</div>
    </section>
  )
}

export function PersonalDashboard({ firstName, stats = { contracts: 0, documents: 0, profileCompleteness: 0 } }: { firstName?: string; stats?: SmartDashboardStats }) {
  const { locale } = useLanguage()
  const search = useSearchParams()
  const de = locale === "de"
  const selected = kintexModules.find((item) => "planned" in item && item.id === search.get("module"))
  const text = de ? {
    title: "Dein finanzielles Home Office.", greeting: firstName ? `Willkommen, ${firstName}.` : "Willkommen bei KintexBG.", subtitle: "Verträge, Unterlagen und nächste Schritte an einem Ort.", overview: "Übersicht", pilot: "Pilotversion", profile: "Profil öffnen", next: "Dein nächster Schritt", profileTitle: "Beginne mit deinem Finanzprofil.", profileSub: "Erfasse Haushalt, Einkommen und laufende Kosten als Grundlage für deine nächsten Schritte.", areas: "Deine Bereiche", planned: "In Vorbereitung", demo: "Connected pilot", documents: "Supabase Storage und AI Status", contracts: "Verträge und laufende Kosten erfassen", profileDetail: "Haushalt, Einkommen und Ausgaben", assistant: "Dokumentenprüfung mit Supabase und AI", deadlines: "Die gemeinsame Fristenübersicht ist noch nicht verbunden. Deine gespeicherten Erinnerungen werden hier noch nicht angezeigt.", opportunities: "Persönliche Möglichkeiten und Tarifangebote sind hier noch nicht verbunden. Geprüfte Ergebnisse werden in einer späteren Phase ergänzt.", insurance: "Der Bereich für deine Versicherungen ist vorbereitet. Bestehende Verträge findest du weiterhin unter Verträge.", credits: "Der Bereich für deine Kredite ist vorbereitet. Bestehende Verträge findest du weiterhin unter Verträge.", back: "Zur Übersicht", contractsLink: "Verträge öffnen", status: "Dieser Bereich wird in einer späteren Phase eingerichtet.",
  } : {
    title: "Твоят финансов домашен офис.", greeting: firstName ? `Здравей, ${firstName}.` : "Добре дошъл в KintexBG.", subtitle: "Договори, документи и следващи стъпки на едно място.", overview: "Преглед", pilot: "Пилотна версия", profile: "Отвори профила", next: "Следваща стъпка", profileTitle: "Започни с финансовия си профил.", profileSub: "Въведи домакинство, доходи и текущи разходи като основа за следващите си стъпки.", areas: "Твоите раздели", planned: "В подготовка", demo: "Свързан pilot", documents: "Supabase Storage и AI статус", contracts: "Въвеждане на договори и текущи разходи", profileDetail: "Домакинство, доходи и разходи", assistant: "Проверка на документи със Supabase и AI", deadlines: "Общият преглед на срокове още не е свързан. Записаните ти напомняния все още не се показват тук.", opportunities: "Личните възможности и тарифните оферти още не са свързани тук. Проверени резултати ще бъдат добавени в следваща фаза.", insurance: "Разделът за застраховки е подготвен. Съществуващите си договори ще намериш в „Договори“.", credits: "Разделът за кредити е подготвен. Съществуващите си договори ще намериш в „Договори“.", back: "Към прегледа", contractsLink: "Отвори договорите", status: "Този раздел ще бъде разработен в следваща фаза.",
  }
  const details: Record<string, string> = { contracts: text.contracts, documents: text.documents, assistant: text.assistant, profile: text.profileDetail }

  if (selected && "planned" in selected) return <main className="px-5 py-10 sm:px-8 lg:px-12 lg:py-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{text.planned}</p><h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{selected[locale]}</h1><section className="mt-10 max-w-2xl border-y border-border py-8"><h2 className="text-lg font-medium">{text.status}</h2><p className="mt-3 text-base leading-7 text-muted-foreground">{text[selected.id]}</p><div className="mt-6 flex flex-wrap gap-3">{(selected.id === "insurance" || selected.id === "credits") && <Button asChild><Link href={localizedPath("/vertraege", locale)}>{text.contractsLink}<ArrowRight aria-hidden="true" /></Link></Button>}<Button asChild variant="outline"><Link href={localizedPath("/protected", locale)}>{text.back}</Link></Button></div></section></main>

  return <main className="px-5 py-10 sm:px-8 lg:px-12 lg:py-12"><section aria-labelledby="dashboard-title"><div className="flex items-center justify-between gap-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{text.overview}</p><span className="border border-border px-2 py-1 text-xs text-muted-foreground">{text.pilot}</span></div><p className="mt-8 break-words text-sm text-muted-foreground">{text.greeting}</p><h1 id="dashboard-title" className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl xl:text-6xl">{text.title}</h1><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">{text.subtitle}</p></section><RadarPanel stats={stats} locale={locale} /><section className="mt-10 grid gap-6 border-y border-border py-8 md:grid-cols-[1fr_auto] md:items-center" aria-labelledby="next-step-title"><div><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{text.next}</p><h2 id="next-step-title" className="mt-3 text-2xl font-semibold tracking-tight">{text.profileTitle}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{text.profileSub}</p></div><Button asChild className="h-11 justify-self-start px-5"><Link href={localizedPath("/profil", locale)}>{text.profile}<ArrowRight aria-hidden="true" /></Link></Button></section><section className="mt-10" aria-labelledby="areas-title"><h2 id="areas-title" className="text-xl font-semibold tracking-tight">{text.areas}</h2><div className="mt-5 grid gap-x-8 md:grid-cols-2">{kintexModules.filter((item) => item.id !== "overview").map((item) => <Link key={item.id} href={localizedPath(item.href, locale)} className="group flex items-start justify-between gap-4 border-t border-border py-5"><div><h3 className="font-medium group-hover:text-primary">{item[locale]}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{"planned" in item ? text.planned : details[item.id]}</p>{item.id === "assistant" && <span className="mt-2 inline-block border border-border px-2 py-0.5 text-xs text-muted-foreground">{text.demo}</span>}</div><ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" /></Link>)}</div></section></main>
}

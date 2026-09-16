"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowUpRight, Bell, CheckCircle2, CircleDollarSign, FileText, Landmark, Receipt, ShieldCheck, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"

type Props = { userId: string; firstName?: string | null; initialReminders: Array<{ id: string; title: string; due_at: string | null }> }

const modules = [
  { href: "/protected/home-office", label: "AI Digital Home Office", description: "Dokumente prüfen und nächste Schritte vorbereiten", icon: FileText, tone: "bg-primary/10 text-primary" },
  { href: "/steuer", label: "Steuern", description: "Steuerdaten strukturiert vorbereiten", icon: Receipt, tone: "bg-primary/10 text-primary" },
  { href: "/anspruch", label: "Ansprüche", description: "Leistungen und Zuschüsse prüfen", icon: Landmark, tone: "bg-success/15 text-success" },
  { href: "/kindergeld", label: "Kindergeld", description: "Formulare und Checkliste vorbereiten", icon: Landmark, tone: "bg-primary/10 text-primary" },
  { href: "/tarife", label: "Verträge & Tarife", description: "Kosten erkennen und senken", icon: WalletCards, tone: "bg-accent/10 text-accent" },
  { href: "/documents", label: "Dokumente", description: "Unterlagen sicher bündeln", icon: FileText, tone: "bg-secondary text-foreground" },
]

export function DashboardWorkspace({ userId, firstName, initialReminders }: Props) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const [reminders, setReminders] = useState(initialReminders)
  const [saving, setSaving] = useState(false)

  async function addReminder() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from("reminders").insert({ user_id: userId, title: "Finanzprofil vervollständigen" }).select("id,title,due_at").single()
    if (data) setReminders((current) => [...current, data])
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-lg font-bold tracking-tight text-primary">KintexBG</Link>
          <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href="/protected/security"><ShieldCheck className="size-4" /> {de ? "Sicherheit" : "Сигурност"}</Link></Button><form action="/auth/logout" method="post"><Button variant="outline" size="sm">{de ? "Abmelden" : "Изход"}</Button></form></div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="flex flex-col justify-between gap-6 border-b border-border pb-8 md:flex-row md:items-end" aria-labelledby="dashboard-title">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Übersicht</p><h1 id="dashboard-title" className="mt-3 text-4xl font-bold tracking-tight text-foreground">Hallo{firstName ? `, ${firstName}` : ""}.</h1><p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">Baue Schritt für Schritt ein klares Bild deiner Finanzen in Deutschland auf.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success"><ShieldCheck className="h-4 w-4" /> Deine Daten bleiben geschützt</div>
        </section>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{modules.map(({ href, label, description, icon: Icon, tone }) => <Link key={href} href={href} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><h2 className="mt-5 font-semibold text-foreground">{label}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">Starten <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" /></span></Link>)}</section>
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-border bg-accent p-6 text-accent-foreground"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-accent-foreground/70">Nächster sinnvoller Schritt</p><h2 className="mt-2 text-2xl font-bold">Vervollständige dein Finanzprofil</h2><p className="mt-3 max-w-lg text-sm leading-6 text-accent-foreground/75">Mit mehr Angaben werden deine Prüfungen genauer. Starte mit Einkommen, Haushalt und laufenden Kosten.</p></div><CircleDollarSign className="hidden h-10 w-10 text-primary sm:block" /></div><Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"><Link href="/profil">Profil öffnen <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div>
          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><h2 className="font-semibold text-foreground">Offene Erinnerungen</h2><Bell className="h-5 w-5 text-muted-foreground" /></div>{reminders.length ? <ul className="mt-4 divide-y divide-border">{reminders.slice(0, 3).map((item) => <li key={item.id} className="flex items-center gap-3 py-3 text-sm"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="flex-1 text-foreground">{item.title}</span><span className="text-xs text-muted-foreground">{item.due_at ? new Date(item.due_at).toLocaleDateString("de-DE") : "Offen"}</span></li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted-foreground">Noch keine offenen Aufgaben.</p>}<Button variant="ghost" size="sm" className="mt-2 px-0 text-primary hover:bg-transparent hover:text-primary" onClick={addReminder} disabled={saving}>{saving ? "Wird gespeichert …" : "Erinnerung hinzufügen"}</Button></div>
        </section>
      </div>
    </main>
  )
}

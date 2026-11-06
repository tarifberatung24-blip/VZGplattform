"use client"

import { useState } from "react"
import { CheckCircle2, CircleAlert, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type BusinessProfile = {
  business_name: string
  legal_form: string
  industry: string
  activity_description: string | null
  street_address: string | null
  postal_code: string | null
  city: string | null
  vat_id: string | null
  tax_number: string | null
  trade_register_number: string | null
  founded_on: string | null
  employee_count: number | null
  annual_revenue_band: string | null
  bookkeeping_method: string | null
  e_invoice_status: string | null
  business_goals: string[]
  business_challenges: string[]
}

type Props = { locale: "bg" | "de"; initialProfile: Partial<BusinessProfile> | null; schemaReady: boolean }

const legalForms = ["einzelunternehmen", "freiberufler", "gbr", "ug", "gmbh", "gmbh_co_kg", "ag", "other"] as const
const revenueBands = ["unknown", "under_22k", "22k_50k", "50k_100k", "100k_250k", "250k_500k", "over_500k"] as const
const bookkeepingMethods = ["unknown", "euer", "bilanz", "not_sure"] as const
const invoiceStatuses = ["not_started", "preparing", "ready", "using", "not_sure"] as const

const labels = {
  bg: {
    title: "Фирмен профил", intro: "Защитена основа за фирмените данни, бъдещите анализи и административните задачи.",
    identity: "Основни данни", businessName: "Име на фирмата / дейността", legalForm: "Правна форма", industry: "Сектор / дейност", activity: "Описание на дейността",
    address: "Адрес", street: "Улица и номер", postal: "Пощенски код", city: "Град",
    identifiers: "Регистрационни данни", vat: "USt-IdNr.", tax: "Steuernummer", register: "Handelsregisternummer", founded: "Дата на започване",
    operations: "Оперативни данни", employees: "Брой служители", revenue: "Годишен оборот", bookkeeping: "Счетоводство", invoice: "E-Rechnung",
    goals: "Бизнес цели (до 6, по една на ред)", challenges: "Основни затруднения (до 6, по едно на ред)",
    save: "Запази профила", saving: "Запазване…", saved: "Профилът е запазен.", failed: "Записът не беше успешен. Провери връзката и опитай отново.",
    schema: "Базата за фирмения профил още не е инсталирана в тази среда. Данните няма да бъдат записани, докато миграцията не бъде приложена.",
    next: "Следващ етап", nextText: "AI диагностика на бизнеса и персонален план 30/60/90 дни. Тази функция още не е активна.",
    legal: "HORIZON организира и подготвя информация. Не замества данъчен или правен съвет и не подава автоматично документи към институции.",
    legalOptions: ["Einzelunternehmen", "Freiberufler", "GbR", "UG (haftungsbeschränkt)", "GmbH", "GmbH & Co. KG", "AG", "Друга"],
    revenueOptions: ["Не е посочено", "Под 22 000 €", "22 000–50 000 €", "50 000–100 000 €", "100 000–250 000 €", "250 000–500 000 €", "Над 500 000 €"],
    booksOptions: ["Не е посочено", "EÜR", "Bilanz", "Не съм сигурен"],
    invoiceOptions: ["Не е започнато", "Подготовка", "Готово", "Използваме го", "Не съм сигурен"],
    goalsHint: "Увеличаване на оборота\nНамаляване на разходите", challengesHint: "Администрация\nФактури",
  },
  de: {
    title: "Unternehmensprofil", intro: "Eine geschützte Grundlage für Unternehmensdaten, spätere Analysen und Verwaltungsaufgaben.",
    identity: "Stammdaten", businessName: "Unternehmensname / Tätigkeit", legalForm: "Rechtsform", industry: "Branche / Tätigkeit", activity: "Beschreibung der Tätigkeit",
    address: "Anschrift", street: "Straße und Hausnummer", postal: "Postleitzahl", city: "Ort",
    identifiers: "Registrierungsdaten", vat: "USt-IdNr.", tax: "Steuernummer", register: "Handelsregisternummer", founded: "Gründungsdatum",
    operations: "Betriebsdaten", employees: "Anzahl der Beschäftigten", revenue: "Jahresumsatz", bookkeeping: "Buchführung", invoice: "E-Rechnung",
    goals: "Unternehmensziele (bis zu 6, eines pro Zeile)", challenges: "Größte Herausforderungen (bis zu 6, eine pro Zeile)",
    save: "Profil speichern", saving: "Wird gespeichert…", saved: "Profil gespeichert.", failed: "Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.",
    schema: "Die Datenbank für das Unternehmensprofil ist in dieser Umgebung noch nicht installiert. Bis zur Migration werden keine Daten gespeichert.",
    next: "Nächster Schritt", nextText: "KI-Unternehmensdiagnose und individueller 30/60/90-Tage-Aktionsplan. Diese Funktion ist noch nicht aktiv.",
    legal: "HORIZON strukturiert und bereitet Informationen vor. Es ersetzt keine Steuer- oder Rechtsberatung und übermittelt keine Unterlagen automatisch an Behörden.",
    legalOptions: ["Einzelunternehmen", "Freiberufler", "GbR", "UG (haftungsbeschränkt)", "GmbH", "GmbH & Co. KG", "AG", "Sonstige"],
    revenueOptions: ["Nicht angegeben", "Unter 22.000 €", "22.000–50.000 €", "50.000–100.000 €", "100.000–250.000 €", "250.000–500.000 €", "Über 500.000 €"],
    booksOptions: ["Nicht angegeben", "EÜR", "Bilanz", "Nicht sicher"],
    invoiceOptions: ["Noch nicht begonnen", "In Vorbereitung", "Bereit", "Wird genutzt", "Nicht sicher"],
    goalsHint: "Umsatz steigern\nKosten senken", challengesHint: "Bürokratie\nRechnungen",
  },
} as const

const emptyProfile: BusinessProfile = {
  business_name: "", legal_form: "einzelunternehmen", industry: "", activity_description: null,
  street_address: null, postal_code: null, city: null, vat_id: null, tax_number: null,
  trade_register_number: null, founded_on: null, employee_count: null, annual_revenue_band: "unknown",
  bookkeeping_method: "unknown", e_invoice_status: "not_started", business_goals: [], business_challenges: [],
}
const toLines = (values: string[] | null | undefined) => (values ?? []).join("\n")
const toList = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 6)

export function BusinessProfileForm({ locale, initialProfile, schemaReady }: Props) {
  const copy = labels[locale]
  const [form, setForm] = useState<BusinessProfile>({ ...emptyProfile, ...initialProfile })
  const [goalsText, setGoalsText] = useState(toLines(initialProfile?.business_goals))
  const [challengesText, setChallengesText] = useState(toLines(initialProfile?.business_challenges))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle")
  const fieldClass = "grid gap-1.5 text-sm font-medium"
  const selectClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setStatus("idle")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setStatus("idle")
    try {
      const response = await fetch("/api/horizon/business-profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, employee_count: form.employee_count === null ? null : Number(form.employee_count), business_goals: toList(goalsText), business_challenges: toList(challengesText) }),
      })
      if (!response.ok) throw new Error("save_failed")
      setStatus("saved")
    } catch {
      setStatus("failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">HORIZON · BUSINESS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">{copy.intro}</p>
      </header>

      {!schemaReady ? <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6"><CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" /><p>{copy.schema}</p></div> : null}

      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{copy.identity}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>{copy.businessName}<Input required minLength={2} maxLength={160} value={form.business_name} onChange={(e) => update("business_name", e.target.value)} /></label>
            <label className={fieldClass}>{copy.legalForm}<select className={selectClass} value={form.legal_form} onChange={(e) => update("legal_form", e.target.value)}>{legalForms.map((value, i) => <option key={value} value={value}>{copy.legalOptions[i]}</option>)}</select></label>
            <label className={fieldClass}>{copy.industry}<Input required minLength={2} maxLength={120} value={form.industry} onChange={(e) => update("industry", e.target.value)} /></label>
            <label className={fieldClass}>{copy.founded}<Input type="date" value={form.founded_on ?? ""} onChange={(e) => update("founded_on", e.target.value || null)} /></label>
            <label className={fieldClass + " sm:col-span-2"}>{copy.activity}<Textarea rows={3} maxLength={1200} value={form.activity_description ?? ""} onChange={(e) => update("activity_description", e.target.value || null)} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{copy.address}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className={fieldClass + " sm:col-span-3"}>{copy.street}<Input maxLength={200} value={form.street_address ?? ""} onChange={(e) => update("street_address", e.target.value || null)} /></label>
            <label className={fieldClass}>{copy.postal}<Input maxLength={20} value={form.postal_code ?? ""} onChange={(e) => update("postal_code", e.target.value || null)} /></label>
            <label className={fieldClass + " sm:col-span-2"}>{copy.city}<Input maxLength={120} value={form.city ?? ""} onChange={(e) => update("city", e.target.value || null)} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{copy.identifiers}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>{copy.vat}<Input maxLength={40} value={form.vat_id ?? ""} onChange={(e) => update("vat_id", e.target.value || null)} /></label>
            <label className={fieldClass}>{copy.tax}<Input maxLength={40} value={form.tax_number ?? ""} onChange={(e) => update("tax_number", e.target.value || null)} /></label>
            <label className={fieldClass + " sm:col-span-2"}>{copy.register}<Input maxLength={40} value={form.trade_register_number ?? ""} onChange={(e) => update("trade_register_number", e.target.value || null)} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{copy.operations}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>{copy.employees}<Input type="number" min={0} max={1000000} value={form.employee_count ?? ""} onChange={(e) => update("employee_count", e.target.value === "" ? null : Number(e.target.value))} /></label>
            <label className={fieldClass}>{copy.revenue}<select className={selectClass} value={form.annual_revenue_band ?? "unknown"} onChange={(e) => update("annual_revenue_band", e.target.value)}>{revenueBands.map((value, i) => <option key={value} value={value}>{copy.revenueOptions[i]}</option>)}</select></label>
            <label className={fieldClass}>{copy.bookkeeping}<select className={selectClass} value={form.bookkeeping_method ?? "unknown"} onChange={(e) => update("bookkeeping_method", e.target.value)}>{bookkeepingMethods.map((value, i) => <option key={value} value={value}>{copy.booksOptions[i]}</option>)}</select></label>
            <label className={fieldClass}>{copy.invoice}<select className={selectClass} value={form.e_invoice_status ?? "not_started"} onChange={(e) => update("e_invoice_status", e.target.value)}>{invoiceStatuses.map((value, i) => <option key={value} value={value}>{copy.invoiceOptions[i]}</option>)}</select></label>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>{copy.goals}<Textarea rows={5} value={goalsText} onChange={(e) => setGoalsText(e.target.value)} placeholder={copy.goalsHint} /></label>
            <label className={fieldClass}>{copy.challenges}<Textarea rows={5} value={challengesText} onChange={(e) => setChallengesText(e.target.value)} placeholder={copy.challengesHint} /></label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || !schemaReady}><Save className="mr-2 size-4" />{busy ? copy.saving : copy.save}</Button>
          {status === "saved" ? <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="size-4" />{copy.saved}</span> : null}
          {status === "failed" ? <span role="alert" className="text-sm text-destructive">{copy.failed}</span> : null}
        </div>
      </form>

      <section className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-7">
        <h2 className="font-semibold">{copy.next}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.nextText}</p>
      </section>
      <p className="mt-6 text-xs leading-6 text-muted-foreground">{copy.legal}</p>
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
import type { Locale } from "@/lib/i18n/dictionaries"

type FormRow = {
  official_name: string
  form_identifier: string
  tax_year: number
  form_version: string
  required_or_conditional: "REQUIRED" | "CONDITIONAL" | "REFERENCE"
  verification_status: "VERIFIED" | "UNVERIFIED"
  mapping_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"
  technical_pdf_status: "NOT_AVAILABLE" | "AVAILABLE" | "VALIDATED"
  registry_status?: "AVAILABLE" | "NOT_AVAILABLE"
  source_retrieval_status?: "RETRIEVED" | "SOURCE_RETRIEVAL_BLOCKED"
  source_id?: string | null
  official_source?: string | null
  official_file?: string | null
  source_type?: "form" | "instruction"
  transaction_family?: string
  bulgarian_title?: string
}

export function TaxFormRegistry({ forms, locale = "bg" }: { forms: FormRow[]; locale?: Locale }) {
  const de = locale === "de"
  const copy = de
    ? {
        eyebrow: "Datenbasis",
        title: "Formular-Registry 2025",
        badge: "Formulare",
        intro: "Die offiziellen 2025-PDFs sind als Quellen hinterlegt. Feld-Mappings bleiben separat offen, bis sie fachlich geprüft wurden.",
        sourcePrefix: "Quellenstatus:",
        sourceOf: "von",
        sourceSuffix: "Quellen abgerufen und registriert. Keine Feld-Mappings wurden automatisch als vollständig markiert.",
        colForm: "Formular",
        colYear: "Jahr",
        colStatus: "Status",
        colMapping: "Mapping",
        colPdf: "PDF",
        required: "Pflicht",
        reference: "Referenz",
        conditional: "Bedingt",
        verified: "Verifiziert",
        unverified: "Unverifiziert",
        notStarted: "Nicht gestartet",
        inProgress: "In Arbeit",
        complete: "Vollständig",
        openPdf: "PDF öffnen",
        notAvailable: "Nicht verfügbar",
        available: "Verfügbar",
        validated: "Validiert",
      }
    : {
        eyebrow: "База данни",
        title: "Регистър на формуляри 2025",
        badge: "формуляра",
        intro: "Официалните PDF файлове за 2025 г. са налични като източници. Картографирането на полета остава отделно, докато не бъде проверено професионално.",
        sourcePrefix: "Статус на източниците:",
        sourceOf: "от",
        sourceSuffix: "източника са изтеглени и регистрирани. Никое картографиране на полета не е отбелязано автоматично като пълно.",
        colForm: "Формуляр",
        colYear: "Година",
        colStatus: "Статус",
        colMapping: "Картографиране",
        colPdf: "PDF",
        required: "Задължителен",
        reference: "Справка",
        conditional: "Условен",
        verified: "Проверен",
        unverified: "Непроверен",
        notStarted: "Не е започнато",
        inProgress: "В ход",
        complete: "Пълно",
        openPdf: "Отвори PDF",
        notAvailable: "Недостъпен",
        available: "Наличен",
        validated: "Валидиран",
      }
  return (
    <section className="mt-10 rounded-md border border-border bg-muted/40 p-5" aria-labelledby="registry-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{copy.eyebrow}</p>
          <h2 id="registry-title" className="mt-1 text-xl font-semibold text-foreground">{copy.title}</h2>
        </div>
        <Badge variant="outline">{forms.length} {copy.badge}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.intro}</p><div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">{copy.sourcePrefix} {forms.filter((form) => form.source_retrieval_status === "RETRIEVED").length} {copy.sourceOf} {forms.length} {copy.sourceSuffix}</div>
      <div className="mt-5 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">{copy.colForm}</th><th className="px-4 py-3 font-medium">{copy.colYear}</th><th className="px-4 py-3 font-medium">{copy.colStatus}</th><th className="px-4 py-3 font-medium">{copy.colMapping}</th><th className="px-4 py-3 font-medium">{copy.colPdf}</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {forms.map((form) => <tr key={form.form_identifier}>
              <td className="px-4 py-3"><div className="font-medium text-foreground">{de ? form.official_name : (form.bulgarian_title ?? form.official_name)}</div><div className="text-xs text-muted-foreground">{form.official_name}</div><div className="font-mono text-xs text-muted-foreground">{form.form_identifier}</div></td>
              <td className="px-4 py-3 text-muted-foreground">{form.tax_year} · v{form.form_version}</td>
              <td className="px-4 py-3"><Badge variant={form.required_or_conditional === "REQUIRED" ? "default" : "secondary"}>{form.required_or_conditional === "REQUIRED" ? copy.required : form.required_or_conditional === "REFERENCE" ? copy.reference : copy.conditional}</Badge><div className="mt-1 text-xs text-muted-foreground">{form.verification_status === "VERIFIED" ? copy.verified : copy.unverified}</div></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{form.mapping_status === "NOT_STARTED" ? copy.notStarted : form.mapping_status === "IN_PROGRESS" ? copy.inProgress : copy.complete}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{form.official_file ? <a className="text-primary underline-offset-4 hover:underline" href={form.official_file} target="_blank" rel="noreferrer">{copy.openPdf}</a> : form.technical_pdf_status === "NOT_AVAILABLE" ? copy.notAvailable : form.technical_pdf_status === "AVAILABLE" ? copy.available : copy.validated}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}

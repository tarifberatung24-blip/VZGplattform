import { CircleAlert, FileCheck2, ShieldCheck } from "lucide-react"
import type { CanonicalTaxReturn2025 } from "@/lib/canonical-tax-model"
import { getPdfReadiness } from "@/lib/tax-pipeline"
import type { Locale } from "@/lib/i18n/dictionaries"

export function TaxPipelineReview({ canonical, locale = "bg" }: { canonical: CanonicalTaxReturn2025; locale?: Locale }) {
  const readiness = getPdfReadiness(canonical)
  const de = locale === "de"
  const copy = de
    ? { title: "Übersicht und Bereitschaft", body: "Eine strukturierte steuerliche Wahrheit, mit Herkunft für jedes Feld und ohne ungeprüfte Annahmen.", forms: "Ausgewählte Formulare", issues: "Validierungsprobleme", status: "Status", readiness: { READY_FOR_USER_USE: "Bereit zur Prüfung", BLOCKED: "Noch nicht bereit" } as Record<string, string>, verification: { UNVERIFIED: "Nicht geprüft", VERIFIED: "Geprüft", PARTIAL: "Teilweise geprüft" } as Record<string, string>, mapping: { FIELD_MAPPING_UNVERIFIED: "Feldzuordnung nicht geprüft", FIELD_MAPPING_VERIFIED: "Feldzuordnung geprüft" } as Record<string, string> }
    : { title: "Преглед и готовност", body: "Една структурирана данъчна истина, с произход на всяко поле и без непроверени предположения.", forms: "Избрани формуляри", issues: "Проблеми с валидацията", status: "Състояние", readiness: { READY_FOR_USER_USE: "Готово за преглед", BLOCKED: "Още не е готово" } as Record<string, string>, verification: { UNVERIFIED: "Непроверено", VERIFIED: "Проверено", PARTIAL: "Частично проверено" } as Record<string, string>, mapping: { FIELD_MAPPING_UNVERIFIED: "Съответствието на полетата не е проверено", FIELD_MAPPING_VERIFIED: "Съответствието на полетата е проверено" } as Record<string, string> }
  // Status values arrive as internal enum strings; render the localized label and fall back to the raw value.
  const verifyLabel = (value: string) => copy.verification[value] ?? value
  const mappingLabel = (value: string) => copy.mapping[value] ?? value
  const statusLabel = (value: string) => copy.readiness[value] ?? value
  // `getPdfReadiness` emits PDF_NOT_FILLABLE in Bulgarian only; the other issue messages are
  // deterministic German field-validation strings, so they stay as-is for both locales.
  const issueMessage = (issue: { code: string; message: string }) =>
    issue.code === "PDF_NOT_FILLABLE"
      ? (de ? "Das offizielle PDF ist nicht als ausfüllbar bestätigt." : "Официалният PDF не е потвърден като попълваем.")
      : issue.message
  return <section className="mt-8 rounded-md border border-border bg-card p-5 shadow-sm" aria-labelledby="tax-pipeline-review"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-primary" /><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{de ? "Steuerliche Übersicht" : "Данъчен преглед"}</p><h2 id="tax-pipeline-review" className="mt-1 text-xl font-semibold text-foreground">{copy.title}</h2></div></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.body}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{copy.forms}</p><p className="mt-1 font-medium text-foreground">{readiness.forms.length}</p></div><div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{copy.issues}</p><p className="mt-1 font-medium text-foreground">{readiness.issues.length}</p></div><div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{copy.status}</p><p className="mt-1 font-medium text-foreground">{statusLabel(readiness.status)}</p></div></div><div className="mt-5 space-y-2">{readiness.forms.map((form) => <div key={form.identifier} className="flex items-start gap-3 rounded-md border border-border p-3"><FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-sm font-medium text-foreground">{form.title}</p><p className="text-xs text-muted-foreground">{form.identifier} · {verifyLabel(form.verificationStatus)} · {mappingLabel(form.mappingStatus)}</p></div></div>)}</div>{readiness.issues.map((issue) => <div key={issue.code} className="mt-3 flex items-start gap-2 rounded-md border border-border bg-secondary p-3 text-sm text-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" />{issueMessage(issue)}</div>)}</section>
}

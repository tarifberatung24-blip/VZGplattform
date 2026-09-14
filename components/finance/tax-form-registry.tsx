import { Badge } from "@/components/ui/badge"

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

export function TaxFormRegistry({ forms }: { forms: FormRow[] }) {
  return (
    <section className="mt-10 rounded-2xl border border-border bg-muted/40 p-5" aria-labelledby="registry-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Datenbasis</p>
          <h2 id="registry-title" className="mt-1 text-xl font-semibold text-foreground">Formular-Registry 2025</h2>
        </div>
        <Badge variant="outline">{forms.length} Formulare</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Die offiziellen 2025-PDFs sind als Quellen hinterlegt. Feld-Mappings bleiben separat offen, bis sie fachlich geprüft wurden.</p><div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">Quellenstatus: {forms.filter((form) => form.source_retrieval_status === "RETRIEVED").length} von {forms.length} Quellen abgerufen und registriert. Keine Feld-Mappings wurden automatisch als vollständig markiert.</div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">Formular</th><th className="px-4 py-3 font-medium">Jahr</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Mapping</th><th className="px-4 py-3 font-medium">PDF</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {forms.map((form) => <tr key={form.form_identifier}>
              <td className="px-4 py-3"><div className="font-medium text-foreground">{form.bulgarian_title ?? form.official_name}</div><div className="text-xs text-muted-foreground">{form.official_name}</div><div className="font-mono text-xs text-muted-foreground">{form.form_identifier}</div></td>
              <td className="px-4 py-3 text-muted-foreground">{form.tax_year} · v{form.form_version}</td>
              <td className="px-4 py-3"><Badge variant={form.required_or_conditional === "REQUIRED" ? "default" : "secondary"}>{form.required_or_conditional === "REQUIRED" ? "Pflicht" : form.required_or_conditional === "REFERENCE" ? "Referenz" : "Bedingt"}</Badge><div className="mt-1 text-xs text-muted-foreground">{form.verification_status === "VERIFIED" ? "Verifiziert" : "Unverifiziert"}</div></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{form.mapping_status === "NOT_STARTED" ? "Nicht gestartet" : form.mapping_status === "IN_PROGRESS" ? "In Arbeit" : "Vollständig"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{form.official_file ? <a className="text-primary underline-offset-4 hover:underline" href={form.official_file} target="_blank" rel="noreferrer">PDF öffnen</a> : form.technical_pdf_status === "NOT_AVAILABLE" ? "Nicht verfügbar" : form.technical_pdf_status === "AVAILABLE" ? "Verfügbar" : "Validiert"}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}

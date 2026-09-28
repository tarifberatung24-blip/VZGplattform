"use client"

import { useState } from "react"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { elsterCredentialPolicyFor, elsterSafetyNoticeFor } from "@/lib/elster-provider"
import { useLanguage } from "@/lib/i18n/language-context"

export function ElsterReviewPackage({ unresolvedFields = 0, selectedForms = ["ESt 1 A"] }: { unresolvedFields?: number; selectedForms?: string[] }) {
  const { locale } = useLanguage()
  const de = locale === "de"
  const copy = de
    ? {
        title: "Überprüfung vor der Übermittlung",
        body: "Zusammenfassung der eingegebenen Daten und ihrer offiziellen Zuordnung. Dies ist keine versendete Erklärung.",
        selectedForms: "Ausgewählte Formulare",
        unresolvedFields: "Offene Felder",
        confirm: "Ich bestätige, dass ich die Daten geprüft habe und verstehe, dass die tatsächliche Übermittlung eine separate Handlung von mir erfordert.",
        confirmedAt: "Bestätigt am",
        prepare: "Für die zertifizierte Übermittlung vorbereiten",
      }
    : {
        title: "Преглед преди подаване",
        body: "Обобщение на въведените данни и официалното им картографиране. Това не е изпратена декларация.",
        selectedForms: "Избрани формуляри",
        unresolvedFields: "Нерешени полета",
        confirm: "Потвърждавам, че прегледах данните и разбирам, че реалното подаване изисква отделно мое действие.",
        confirmedAt: "Потвърдено на",
        prepare: "Подготви за удостоверено подаване",
      }
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const confirm = () => setConfirmedAt(new Date().toISOString())
  return <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="elster-review-title">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-primary" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ELSTER-ready</p><h2 id="elster-review-title" className="mt-1 text-xl font-semibold text-foreground">{copy.title}</h2></div></div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.body}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{copy.selectedForms}</p><p className="mt-1 font-medium text-foreground">{selectedForms.join(", ")}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{copy.unresolvedFields}</p><p className="mt-1 font-medium text-foreground">{unresolvedFields}</p></div></div>
    <div className="mt-4 rounded-xl border border-border bg-secondary p-4"><div className="flex gap-2"><AlertTriangle className="size-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-foreground">{elsterSafetyNoticeFor(locale)}</p></div></div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{elsterCredentialPolicyFor(locale)}</p>
    <label className="mt-5 flex items-start gap-3 text-sm text-foreground"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={Boolean(confirmedAt)} onChange={(event) => event.target.checked ? confirm() : setConfirmedAt(null)} />{copy.confirm}</label>
    {confirmedAt && <p className="mt-3 text-xs text-muted-foreground">{copy.confirmedAt} {new Date(confirmedAt).toLocaleString(de ? "de-DE" : "bg-BG")}.</p>}
    <Button className="mt-4 h-auto max-w-full whitespace-normal py-2.5 text-center leading-snug" disabled={!confirmedAt} type="button">{copy.prepare}</Button>
  </section>
}

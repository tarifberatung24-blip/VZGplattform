"use client"

import { useState } from "react"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { elsterCredentialPolicy, elsterSafetyNotice } from "@/lib/elster-provider"

export function ElsterReviewPackage({ unresolvedFields = 0, selectedForms = ["ESt 1 A"] }: { unresolvedFields?: number; selectedForms?: string[] }) {
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const confirm = () => setConfirmedAt(new Date().toISOString())
  return <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="elster-review-title">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-5 text-primary" /><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ELSTER-ready</p><h2 id="elster-review-title" className="mt-1 text-xl font-semibold text-foreground">Преглед преди подаване</h2></div></div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Обобщение на въведените данни и официалното им картографиране. Това не е изпратена декларация.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Избрани формуляри</p><p className="mt-1 font-medium text-foreground">{selectedForms.join(", ")}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Нерешени полета</p><p className="mt-1 font-medium text-foreground">{unresolvedFields}</p></div></div>
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><div className="flex gap-2"><AlertTriangle className="size-5 shrink-0 text-amber-600" /><p className="text-sm leading-6 text-foreground">{elsterSafetyNotice}</p></div></div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">{elsterCredentialPolicy}</p>
    <label className="mt-5 flex items-start gap-3 text-sm text-foreground"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={Boolean(confirmedAt)} onChange={(event) => event.target.checked ? confirm() : setConfirmedAt(null)} />Потвърждавам, че прегледах данните и разбирам, че реалното подаване изисква отделно мое действие.</label>
    {confirmedAt && <p className="mt-3 text-xs text-muted-foreground">Потвърдено на {new Date(confirmedAt).toLocaleString("bg-BG")}.</p>}
    <Button className="mt-4" disabled={!confirmedAt} type="button">Подготви за удостоверено подаване</Button>
  </section>
}

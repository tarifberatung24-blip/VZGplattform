"use client"

import { useCallback, useEffect, useState } from "react"
import { FileText, HeartHandshake, Loader2, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { BenefitCheckRecord, EligibleBenefit } from "@/lib/benefits/types"

type TaxAssessment = { id: string; profession: string; total_amount: number; created_at: string }
type UserDocument = { id: string; file_name: string; status: string; created_at: string }

export function WorkspaceOverview() {
  const [tax, setTax] = useState<TaxAssessment[]>([])
  const [checks, setChecks] = useState<BenefitCheckRecord[]>([])
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const [{ data: taxData, error: taxError }, { data: checkData, error: checkError }, { data: documentData, error: documentError }] = await Promise.all([
        supabase.from("tax_assessments").select("id,profession,total_amount,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("benefit_checks").select("id,user_id,answers,eligible_benefits,rules_version,created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("user_documents").select("id,file_name,status,created_at").order("created_at", { ascending: false }).limit(10),
      ])
      if (taxError) throw taxError
      if (checkError) throw checkError
      if (documentError) throw documentError
      setTax((taxData ?? []) as TaxAssessment[])
      setChecks((checkData ?? []) as unknown as BenefitCheckRecord[])
      setDocuments((documentData ?? []) as UserDocument[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Workspace data could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totalDeductions = tax.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  const latestBenefits = [...new Map(checks.flatMap((check) => (check.eligible_benefits ?? []).map((benefit) => [benefit.key, benefit]))).values()] as EligibleBenefit[]

  return <section className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Личен workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Вашият финансов преглед</h1><p className="mt-2 text-muted-foreground">Всички данни са филтрирани по вашия auth.uid() чрез Supabase RLS.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> Обнови</Button></div>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    {loading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Зареждане на вашите данни...</div> : <>
      <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><ReceiptText className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Общо въведени разходи</p><p className="mt-1 text-2xl font-semibold">{totalDeductions.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p></CardContent></Card><Card><CardContent className="p-5"><HeartHandshake className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Релевантни помощи</p><p className="mt-1 text-2xl font-semibold">{latestBenefits.length}</p></CardContent></Card><Card><CardContent className="p-5"><FileText className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Документи</p><p className="mt-1 text-2xl font-semibold">{documents.length}</p></CardContent></Card></div>
      <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Възможни помощи</CardTitle></CardHeader><CardContent>{latestBenefits.length ? <ul className="space-y-3">{latestBenefits.map((benefit) => <li key={benefit.key} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{benefit.title}</p><span className="text-xs font-medium text-primary">{benefit.confidence === "likely" ? "Вероятно" : "Възможно"}</span></div><p className="mt-1 text-sm text-muted-foreground">{benefit.explanation}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Все още няма запазена проверка. Стартирайте я от страницата Anspruch.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Последни документи</CardTitle></CardHeader><CardContent>{documents.length ? <ul className="space-y-3">{documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><p className="font-medium">{document.file_name}</p><p className="text-xs text-muted-foreground">{document.status}</p></div></div><span className="text-xs text-muted-foreground">{new Date(document.created_at).toLocaleDateString("de-DE")}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Все още няма качени документи.</p>}</CardContent></Card></div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Достъпът е ограничен до вашите записи чрез RLS policies.</div>
    </>}
  </section>
}

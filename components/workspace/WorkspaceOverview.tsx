"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FileText, HeartHandshake, Loader2, ReceiptText, RefreshCw, ShieldCheck, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { BenefitCheckRecord, EligibleBenefit } from "@/lib/benefits/types"

type TaxAssessment = {
  id: string
  profession: string
  tax_year: number | null
  total_amount: number
  screening_status: string
  created_at: string
}

type UserDocument = {
  id: string
  file_name: string
  status: "uploaded" | "processing" | "ready" | "error" | string
  created_at: string
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" })
const currencyFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

function statusLabel(status: UserDocument["status"]) {
  return {
    uploaded: "Получен",
    processing: "Обработва се",
    ready: "Готов",
    error: "Нужна е проверка",
  }[status] ?? status
}

export function WorkspaceOverview() {
  const [tax, setTax] = useState<TaxAssessment[]>([])
  const [checks, setChecks] = useState<BenefitCheckRecord[]>([])
  const [documents, setDocuments] = useState<UserDocument[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError && userError.name !== "AuthSessionMissingError") throw userError
      if (!userData.user) {
        setIsAuthenticated(false)
        setTax([])
        setChecks([])
        setDocuments([])
        return
      }

      setIsAuthenticated(true)
      const [{ data: taxData, error: taxError }, { data: checkData, error: checkError }, { data: documentData, error: documentError }] = await Promise.all([
        supabase.from("tax_assessments").select("id,profession,tax_year,total_amount,screening_status,created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("benefit_checks").select("id,user_id,answers,eligible_benefits,eligible_benefit_keys,reasoning,rules_version,created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("user_documents").select("id,file_name,status,created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(10),
      ])

      if (taxError) throw taxError
      if (checkError) throw checkError
      if (documentError) throw documentError
      setTax((taxData ?? []) as TaxAssessment[])
      setChecks((checkData ?? []) as unknown as BenefitCheckRecord[])
      setDocuments((documentData ?? []) as UserDocument[])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Данните не могат да бъдат заредени в момента.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const supabase = createClient()
    const channel = supabase
      .channel("workspace-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "tax_assessments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "benefit_checks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_documents" }, () => void load())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const totalDeductions = useMemo(() => tax.reduce((sum, item) => sum + Number(item.total_amount || 0), 0), [tax])
  const latestBenefits = useMemo(
    () => [...new Map(checks.flatMap((check) => (check.eligible_benefits ?? []).map((benefit) => [benefit.key, benefit]))).values()] as EligibleBenefit[],
    [checks],
  )
  const latestAssessment = tax[0]
  const latestCheck = checks[0]

  if (!loading && !isAuthenticated) {
    return (
      <Card className="mx-auto max-w-xl border-primary/20">
        <CardContent className="p-8 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Влезте, за да видите данните си</h1>
          <p className="mt-2 text-muted-foreground">Вашият личен преглед се показва само след вход в профила.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Вашият преглед</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Всичко важно на едно място</h1>
          <p className="mt-2 text-muted-foreground">Данъчни изчисления, възможни помощи и документи в един преглед.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} /> Обнови
        </Button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="animate-spin" /> Зареждаме вашия преглед...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-5"><ReceiptText className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Общо заявени разходи</p><p className="mt-1 text-2xl font-semibold">{currencyFormatter.format(totalDeductions)}</p><p className="mt-1 text-xs text-muted-foreground">{tax.length ? `${tax.length} изчисления` : "Все още няма изчисление"}</p></CardContent></Card>
            <Card><CardContent className="p-5"><HeartHandshake className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Възможни помощи</p><p className="mt-1 text-2xl font-semibold">{latestBenefits.length}</p><p className="mt-1 text-xs text-muted-foreground">От последните проверки</p></CardContent></Card>
            <Card><CardContent className="p-5"><FileText className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Ваши документи</p><p className="mt-1 text-2xl font-semibold">{documents.length}</p><p className="mt-1 text-xs text-muted-foreground">Съхранени в профила ви</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Последно данъчно изчисление</CardTitle></CardHeader><CardContent>{latestAssessment ? <div className="rounded-xl border p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{latestAssessment.profession || "Данъчно изчисление"} {latestAssessment.tax_year ? `· ${latestAssessment.tax_year}` : ""}</p><p className="mt-1 text-sm text-muted-foreground">{dateFormatter.format(new Date(latestAssessment.created_at))}</p></div><WalletCards className="size-5 text-primary" /></div><p className="mt-5 text-2xl font-semibold">{currencyFormatter.format(Number(latestAssessment.total_amount || 0))}</p><p className="mt-1 text-sm text-muted-foreground">Въведени и screening разходи · {latestAssessment.screening_status === "review_possible" ? "нужна е проверка" : "предварителен резултат"}</p></div> : <p className="text-sm text-muted-foreground">Все още няма запазено данъчно изчисление.</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Възможни помощи</CardTitle></CardHeader><CardContent>{latestBenefits.length ? <><ul className="space-y-3">{latestBenefits.map((benefit) => <li key={benefit.key} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{benefit.title}</p><span className="text-xs font-medium text-primary">{benefit.confidence === "likely" ? "Вероятно" : "Възможно"}</span></div><p className="mt-1 text-sm text-muted-foreground">{benefit.explanation}</p></li>)}</ul>{latestCheck?.reasoning && <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{latestCheck.reasoning}</p>}</> : <p className="text-sm text-muted-foreground">Няма запазена проверка. Направете проверка на възможните помощи, за да видите резултатите тук.</p>}</CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle>Последни документи</CardTitle></CardHeader><CardContent>{documents.length ? <ul className="space-y-3">{documents.map((document) => <li key={document.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><p className="font-medium">{document.file_name}</p><p className="text-xs text-muted-foreground">{statusLabel(document.status)}</p></div></div><span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(document.created_at))}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Все още няма добавени документи.</p>}</CardContent></Card>

          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Данните ви са достъпни само във вашия профил.</div>
        </>
      )}
    </section>
  )
}

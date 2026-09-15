"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { BENEFIT_ANSWER_KEYS, type BenefitAnswerKey, type BenefitAnswers, type EligibleBenefit } from "@/lib/benefits/types"

const QUESTIONS: Array<{ key: BenefitAnswerKey; title: string; detail: string }> = [
  { key: "has_children", title: "Имате ли деца?", detail: "Отговорете за децата, които са част от вашето домакинство." },
  { key: "children_under_18", title: "Има ли дете под 18 години?", detail: "Този отговор помага да проверим Kindergeld и свързани помощи." },
  { key: "monthly_income_under_1500", title: "Месечният доход на домакинството под 1.500 € ли е?", detail: "Използвайте приблизителния доход след данъци и осигуровки." },
  { key: "pays_rent", title: "Плащате ли наем за жилището си?", detail: "Включете само редовния наем и разходите, свързани с жилището." },
  { key: "currently_unemployed", title: "В момента безработен/на ли сте?", detail: "Временна или продължителна безработица може да промени резултата." },
  { key: "has_disability_or_special_needs", title: "Имате ли увреждане или специални потребности в домакинството?", detail: "Това е сигнал за допълнителна индивидуална консултация." },
]

const emptyAnswers = (): Partial<BenefitAnswers> => ({})

export function EligibilityEngine() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<BenefitAnswers>>(emptyAnswers)
  const [results, setResults] = useState<EligibleBenefit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const question = QUESTIONS[step]
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100)
  const allAnswered = useMemo(() => BENEFIT_ANSWER_KEYS.every((key) => typeof answers[key] === "boolean"), [answers])

  function answer(value: boolean) {
    setAnswers((current) => ({ ...current, [question.key]: value }))
    setError(null)
  }

  async function submit() {
    if (!allAnswered) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error("Моля, влезте в профила си, за да запазите резултата.")
      const response = await fetch("/api/benefit-checks", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Резултатът не може да бъде запазен.")
      setResults(payload.check.eligible_benefits)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Резултатът не може да бъде запазен.")
    } finally {
      setSaving(false)
    }
  }

  function restart() {
    setStep(0)
    setAnswers(emptyAnswers)
    setResults(null)
    setError(null)
  }

  if (results) {
    return (
      <section className="space-y-6" aria-live="polite">
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div><p className="font-semibold">Вашата предварителна проверка е готова.</p><p className="mt-1 text-sm text-emerald-800">Това е информационен резултат, не официално решение. Всяка институция проверява индивидуалните ви документи.</p></div>
        </div>
        {results.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><CircleAlert className="mx-auto size-8 text-amber-600" /><h2 className="mt-4 text-xl font-semibold">Не открихме очевидно съвпадение</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Отговорите ви не покриват базовите правила в тази първа версия. Това не означава, че нямате право на подкрепа.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{results.map((benefit) => <Card key={benefit.key} className="border-border/80"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{benefit.title}</CardTitle><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{benefit.confidence === "likely" ? "Вероятно" : "Възможно"}</span></div><CardDescription>{benefit.shortLabel}</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{benefit.explanation}</p><div className="mt-5 rounded-xl bg-muted/60 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-foreground">Следваща стъпка</p><p className="mt-1 text-sm">{benefit.nextStep}</p></div></CardContent></Card>)}</div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Запазихме резултата във вашия профил с включена защита на редовете.</p><Button variant="outline" onClick={restart}>Нова проверка</Button></div>
      </section>
    )
  }

  return (
    <Card className="overflow-hidden border-border/80 shadow-lg shadow-black/5">
      <div className="h-1.5 bg-muted"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} /></div>
      <CardHeader className="p-6 pb-4 sm:p-8 sm:pb-5"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Въпрос {step + 1} от {QUESTIONS.length}</p><CardTitle className="mt-3 text-2xl">{question.title}</CardTitle><CardDescription className="mt-2 max-w-xl text-base">{question.detail}</CardDescription></div><div className="hidden size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex"><Sparkles className="size-6" /></div></div></CardHeader>
      <CardContent className="space-y-6 p-6 pt-3 sm:p-8 sm:pt-4"><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => answer(true)} aria-pressed={answers[question.key] === true} className={`rounded-2xl border p-5 text-left transition ${answers[question.key] === true ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "hover:border-primary/50 hover:bg-muted/40"}`}><span className="text-lg font-semibold">Да</span><span className="mt-1 block text-sm text-muted-foreground">Това се отнася за мен</span></button><button type="button" onClick={() => answer(false)} aria-pressed={answers[question.key] === false} className={`rounded-2xl border p-5 text-left transition ${answers[question.key] === false ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "hover:border-primary/50 hover:bg-muted/40"}`}><span className="text-lg font-semibold">Не</span><span className="mt-1 block text-sm text-muted-foreground">Това не се отнася за мен</span></button></div>{error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="flex items-center justify-between gap-3 border-t pt-5"><Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft /> Назад</Button>{step < QUESTIONS.length - 1 ? <Button onClick={() => setStep((current) => current + 1)} disabled={typeof answers[question.key] !== "boolean"}>Продължи <ArrowRight /></Button> : <Button onClick={submit} disabled={!allAnswered || saving}>{saving ? <><Loader2 className="animate-spin" /> Запазване...</> : <>Вижте резултатите <ArrowRight /></>}</Button>}</div><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Отговорите са достъпни само за вашия профил.</p></CardContent>
    </Card>
  )
}

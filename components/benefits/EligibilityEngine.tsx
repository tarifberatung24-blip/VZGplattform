"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BENEFIT_ANSWER_KEYS, type BenefitAnswerKey, type BenefitAnswers, type EligibleBenefit } from "@/lib/benefits/types"

const QUESTIONS: Array<{ key: BenefitAnswerKey; title: string; detail: string }> = [
  { key: "has_children", title: "Имате ли деца в домакинството?", detail: "Отговорете за децата, за които реално полагате грижи." },
  { key: "children_under_18", title: "Има ли дете под 18 години?", detail: "Това е базов screening сигнал за Kindergeld и свързани помощи." },
  { key: "monthly_income_under_1500", title: "Доходът на домакинството под 1 500 EUR месечно ли е?", detail: "Това е евристика, не законов праг. По-късно ще са нужни точни доходи и период." },
  { key: "pays_rent", title: "Плащате ли наем за жилището си?", detail: "Включете обичайния наем; точната Wohngeld проверка изисква община и Mietstufe." },
  { key: "currently_unemployed", title: "В момента безработен/на ли сте?", detail: "Jobcenter проверява допълнително Erwerbsfähigkeit, имущество и Bedarfsgemeinschaft." },
  { key: "has_disability_or_special_needs", title: "Има ли увреждане или специални потребности?", detail: "Това насочва към индивидуална проверка, но не доказва конкретна помощ." },
]

export function EligibilityEngine() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<BenefitAnswers>>({})
  const [results, setResults] = useState<EligibleBenefit[] | null>(null)
  const [reasoning, setReasoning] = useState("")
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
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Влезте в профила си, за да запазите резултата.")
      const response = await fetch("/api/benefit-checks", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ answers }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Резултатът не може да бъде запазен.")
      setResults(payload.check.eligible_benefits as EligibleBenefit[])
      setReasoning(payload.check.reasoning ?? "")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Резултатът не може да бъде запазен.")
    } finally {
      setSaving(false)
    }
  }

  function restart() {
    setStep(0)
    setAnswers({})
    setResults(null)
    setReasoning("")
    setError(null)
  }

  if (results) {
    return <section className="space-y-5" aria-live="polite"><div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-emerald-100 backdrop-blur-xl"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-300" /><div><p className="font-semibold">Предварителният резултат е готов.</p><p className="mt-1 text-sm leading-6 text-emerald-100/70">Резултатът е записан във вашия профил и не представлява официално решение.</p></div></div></div>{results.length ? <div className="grid gap-4 md:grid-cols-2">{results.map((benefit) => <article key={benefit.key} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{benefit.shortLabel}</p><h2 className="mt-2 text-xl font-semibold text-white">{benefit.title}</h2></div><span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Възможно</span></div><p className="mt-5 text-sm leading-7 text-slate-400">{benefit.explanation}</p><div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Следваща стъпка</p><p className="mt-2 text-sm leading-6 text-slate-300">{benefit.nextStep}</p></div></article>)}</div> : <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-7 text-center"><CircleAlert className="mx-auto size-8 text-amber-300" /><h2 className="mt-4 text-xl font-semibold text-white">Няма очевиден screening сигнал</h2><p className="mt-2 text-sm leading-6 text-slate-400">Това не означава, че нямате право на подкрепа. Пълната проверка изисква повече факти и документи.</p></div>}{reasoning && <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-sm leading-7 text-slate-400">{reasoning}</div>}<div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-400"><strong className="text-slate-200">Disclaimer:</strong> Това е ориентировъчен screening, а не правен, данъчен или социален съвет. Правото, размерът и съвместимостта на помощите се определят от Familienkasse, Wohngeldbehörde, Jobcenter или друг компетентен орган след проверка на документите.</div><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-cyan-300" /> Данните са изолирани с RLS.</p><button onClick={restart} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 transition hover:border-cyan-400/50">Нова проверка</button></div></section>
  }

  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"><div className="h-1.5 bg-white/10"><div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all" style={{ width: `${progress}%` }} /></div><div className="p-6 sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Въпрос {step + 1} от {QUESTIONS.length}</p><h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{question.title}</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">{question.detail}</p></div><div className="hidden size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 sm:flex"><Sparkles /></div></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => answer(true)} aria-pressed={answers[question.key] === true} className={`rounded-2xl border p-5 text-left transition ${answers[question.key] === true ? "border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400/20" : "border-white/10 bg-slate-950/50 hover:border-cyan-400/50"}`}><span className="text-lg font-semibold text-white">Да</span><span className="mt-1 block text-sm text-slate-500">Това се отнася за мен</span></button><button type="button" onClick={() => answer(false)} aria-pressed={answers[question.key] === false} className={`rounded-2xl border p-5 text-left transition ${answers[question.key] === false ? "border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400/20" : "border-white/10 bg-slate-950/50 hover:border-cyan-400/50"}`}><span className="text-lg font-semibold text-white">Не</span><span className="mt-1 block text-sm text-slate-500">Това не се отнася за мен</span></button></div>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}<div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5"><button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 disabled:opacity-30"><ArrowLeft className="size-4" />Назад</button>{step < QUESTIONS.length - 1 ? <button onClick={() => setStep((current) => current + 1)} disabled={typeof answers[question.key] !== "boolean"} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Продължи<ArrowRight className="size-4" /></button> : <button onClick={submit} disabled={!allAnswered || saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{saving ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}Вижте резултатите</button>}</div><p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-cyan-300" /> Вашите отговори се записват само след вход.</p></div></section>
}

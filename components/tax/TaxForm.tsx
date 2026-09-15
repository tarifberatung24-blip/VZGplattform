"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Loader2, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { calculateTaxAssessment, type TaxInputs, type TaxYear } from "@/lib/tax-logic"

const STEPS = ["Общи данни", "Пътуване и home office", "Професионални разходи", "Специални разходи", "Обобщение"]

type FormState = TaxInputs

const initialState: FormState = {
  taxYear: 2025,
  residenceCountry: "Германия",
  taxLiability: "unknown",
  steuerklasse: null,
  commuteDistanceKm: 0,
  officeDays: 0,
  homeOfficeDays: 0,
  workEquipment: 0,
  workClothing: 0,
  training: 0,
  otherProfessionalExpenses: 0,
  childcare: 0,
  medicalAndInsurance: 0,
}

function euro(value: number) {
  return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(value)
}

function amount(value: string) {
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function NumberField({ label, hint, value, onChange, step = "0.01" }: { label: string; hint?: string; value: number; onChange: (value: number) => void; step?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {hint && <span className="block text-xs leading-5 text-slate-500">{hint}</span>}
      <div className="relative">
        <input type="number" min="0" step={step} value={value || ""} onChange={(event) => onChange(amount(event.target.value))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 pr-12 text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20" />
        <span className="pointer-events-none absolute right-4 top-3 text-sm text-slate-500">€</span>
      </div>
    </label>
  )
}

export function TaxForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const result = useMemo(() => calculateTaxAssessment(form), [form])
  const progress = ((step + 1) / STEPS.length) * 100
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  function next() {
    setError(null)
    if (step === 0 && (!form.residenceCountry.trim() || !form.steuerklasse || form.steuerklasse < 1 || form.steuerklasse > 6)) {
      setError("Посочете държава на данъчно местоживеене и Steuerklasse от 1 до 6.")
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) {
        router.push("/auth/login?next=/steuer")
        return
      }
      const expenses = {
        work_equipment: form.workEquipment,
        work_clothing: form.workClothing,
        training: form.training,
        other_professional_expenses: form.otherProfessionalExpenses,
        childcare: form.childcare,
        medical_and_insurance: form.medicalAndInsurance,
      }
      const { error: insertError } = await supabase.from("tax_assessments").insert({
        user_id: auth.user.id,
        profession: "employee",
        tax_year: form.taxYear,
        residence_country: form.residenceCountry,
        tax_liability: form.taxLiability,
        steuerklasse: form.steuerklasse,
        commute_distance_km: form.commuteDistanceKm,
        office_days: form.officeDays,
        home_office_days: form.homeOfficeDays,
        expenses,
        total_amount: result.documentedExpensesTotal,
        documented_expenses: result.documentedExpensesTotal,
        calculated_result: JSON.parse(JSON.stringify(result)),
        screening_status: result.status,
      })
      if (insertError) throw insertError
      setSaved(true)
    } catch {
      setError("Записът не беше извършен. Проверете дали последната Supabase migration е приложена.")
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <section className="rounded-3xl border border-emerald-400/20 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 /></div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Данните са записани</h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-400">Съхранихме вашата предварителна данъчна оценка за {form.taxYear}. Сумата {euro(result.documentedExpensesTotal)} е сбор на въведени и ориентировъчно признати разходи, не обещание за възстановяване.</p>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => router.push("/workspace")} className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950">Към Workspace</button><button onClick={() => { setSaved(false); setStep(0); setForm(initialState) }} className="rounded-xl border border-white/10 px-5 py-3 text-slate-200">Нова оценка</button></div>
    </section>
  }

  return <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Tax Assessment</p><h2 className="mt-2 text-2xl font-semibold text-white">{STEPS[step]}</h2><p className="mt-2 text-sm text-slate-400">Стъпка {step + 1} от {STEPS.length} · предварителен screening по правилата за 2024–2025 г.</p></div><span className="text-sm tabular-nums text-slate-500">{Math.round(progress)}%</span></div>
    <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all" style={{ width: `${progress}%` }} /></div>
    <div className="mt-8">
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2"><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Данъчна година</span><select value={form.taxYear} onChange={(e) => update("taxYear", Number(e.target.value) as TaxYear)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100"><option value="2025">2025</option><option value="2024">2024</option></select></label><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Данъчно местоживеене</span><input value={form.residenceCountry} onChange={(e) => update("residenceCountry", e.target.value)} placeholder="Германия" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400/70" /></label><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Steuerklasse</span><select value={form.steuerklasse ?? ""} onChange={(e) => update("steuerklasse", e.target.value ? Number(e.target.value) : null)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100"><option value="">Изберете</option>{[1,2,3,4,5,6].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block space-y-2"><span className="text-sm font-medium text-slate-200">Данъчна задълженост</span><select value={form.taxLiability} onChange={(e) => update("taxLiability", e.target.value as FormState["taxLiability"])} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100"><option value="unknown">Не е уточнена</option><option value="unlimited">Неограничена</option><option value="limited">Ограничена</option></select></label></div>}
      {step === 1 && <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Еднопосочно разстояние до първото работно място" hint="Entfernungspauschale използва еднопосочните километри." value={form.commuteDistanceKm} onChange={(value) => update("commuteDistanceKm", value)} /><NumberField label="Действителни офис дни" hint="Дни с посещение на erste Tätigkeitsstätte." value={form.officeDays} onChange={(value) => update("officeDays", value)} step="1" /><NumberField label="Дни home office" hint="Ще бъдат ограничени до 210 дни и 1 260 EUR." value={form.homeOfficeDays} onChange={(value) => update("homeOfficeDays", value)} step="1" /><div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5 text-sm leading-6 text-slate-300"><p className="font-medium text-cyan-200">Правило за разстоянието</p><p className="mt-2">0,30 EUR за първите 20 km и 0,38 EUR от 21-вия km. Не броим един ден едновременно като commute и home office.</p></div></div>}
      {step === 2 && <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Работно оборудване" hint="Компютър, софтуер, Fachliteratur и други доказуеми Arbeitsmittel." value={form.workEquipment} onChange={(value) => update("workEquipment", value)} /><NumberField label="Типично професионално облекло" hint="Не включвайте ежедневно облекло." value={form.workClothing} onChange={(value) => update("workClothing", value)} /><NumberField label="Обучение и квалификация" hint="Курсове, семинари, изпити и Weiterbildung." value={form.training} onChange={(value) => update("training", value)} /><NumberField label="Други професионални разходи" hint="Само разходи с професионална връзка и доказателство." value={form.otherProfessionalExpenses} onChange={(value) => update("otherProfessionalExpenses", value)} /></div>}
      {step === 3 && <div className="grid gap-5 sm:grid-cols-2"><NumberField label="Разходи за детска грижа" hint={form.taxYear === 2025 ? "Screening: 80% до 4 800 EUR на дете." : "Screening: 2/3 до 4 000 EUR на дете."} value={form.childcare} onChange={(value) => update("childcare", value)} /><NumberField label="Медицински и извънредни разходи" hint="Außergewöhnliche Belastungen изискват доказателства и проверка на zumutbare Belastung." value={form.medicalAndInsurance} onChange={(value) => update("medicalAndInsurance", value)} /><div className="sm:col-span-2 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5 text-sm leading-6 text-amber-100/80"><p className="font-medium text-amber-200">Важно за доказателствата</p><p className="mt-2">Пазете фактури, банкови плащания, медицински документи и удостоверения. Тази форма не доказва автоматично допустимостта на разхода.</p></div></div>}
      {step === 4 && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><Summary label="Професионални разходи" value={euro(result.documentedProfessionalExpenses)} /><Summary label="Над Arbeitnehmer-Pauschbetrag" value={euro(result.professionalExpensesAbovePauschbetrag)} /><Summary label="Entfernungspauschale" value={euro(result.entfernungspauschale)} /><Summary label="Homeoffice" value={`${euro(result.homeOfficeAmount)} · ${result.homeOfficeDaysAccepted} дни`} /><Summary label="Детска грижа — screening" value={euro(result.childcareRecognizedScreening)} /><Summary label="Общо въведено/ориентировъчно" value={euro(result.documentedExpensesTotal)} /></div>{result.reviewReasons.map((reason) => <div key={reason} className="flex gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100"><CircleAlert className="mt-0.5 size-5 shrink-0" /><span>{reason}</span></div>)}{result.warnings.map((warning) => <div key={warning} className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">{warning}</div>)}<div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400"><div className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-cyan-300" /><p><strong className="text-slate-200">Disclaimer:</strong> Това е предварителен screening по зададени от вас данни и правила за съответната година. Не е данъчен, правен или финансов съвет, не е Steuerbescheid и не гарантира право или възстановяване. Окончателното решение взема Finanzamt.</p></div></div></div>}
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p>}
    <div className="mt-8 flex justify-between gap-3"><button type="button" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || saving} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 disabled:opacity-40"><ArrowLeft className="size-4" />Назад</button>{step < STEPS.length - 1 ? <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">Продължи<ArrowRight className="size-4" /></button> : <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Запази оценката</button>}</div>
  </section>
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-white">{value}</p></div>
}

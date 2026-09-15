"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n/language-context"

type Profile = { employment_status: string | null; household_size: number | null; monthly_income: number | null; monthly_fixed_costs: number | null; completeness: number } | null
export function ProfileForm({ userId, initialProfile }: { userId: string; initialProfile: Profile }) {
  const { locale, t } = useLanguage()
  const copy = t.profile
  const [form, setForm] = useState({ employment_status: initialProfile?.employment_status ?? "", household_size: initialProfile?.household_size?.toString() ?? "", monthly_income: initialProfile?.monthly_income?.toString() ?? "", monthly_fixed_costs: initialProfile?.monthly_fixed_costs?.toString() ?? "" })
  const [message, setMessage] = useState("")
  async function save(event: React.FormEvent) { event.preventDefault(); const supabase = createClient(); const filled = Object.values(form).filter(Boolean).length; const { error } = await supabase.from("profiles").upsert({ id: userId, employment_status: form.employment_status || null, household_size: form.household_size ? Number(form.household_size) : null, monthly_income: form.monthly_income ? Number(form.monthly_income) : null, monthly_fixed_costs: form.monthly_fixed_costs ? Number(form.monthly_fixed_costs) : null, completeness: filled * 25, updated_at: new Date().toISOString() }); setMessage(error ? copy.saveError : copy.saved) }
  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-2xl px-5 py-10"><Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" /> {copy.back}</Link><h1 className="mt-8 text-4xl font-semibold tracking-tight">{copy.title}</h1><p className="mt-3 leading-7 text-muted-foreground">{copy.description}</p><form onSubmit={save} className="kintex-panel mt-8 space-y-5 p-6"><div><Label htmlFor="employment_status">{copy.employment}</Label><Input id="employment_status" className="mt-2" value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })} placeholder={copy.employmentPlaceholder} /></div><div><Label htmlFor="household_size">{copy.household}</Label><Input id="household_size" type="number" min="1" className="mt-2" value={form.household_size} onChange={(e) => setForm({ ...form, household_size: e.target.value })} /></div><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="monthly_income">{copy.income}</Label><Input id="monthly_income" type="number" min="0" step="0.01" className="mt-2" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} /></div><div><Label htmlFor="monthly_fixed_costs">{copy.fixedCosts}</Label><Input id="monthly_fixed_costs" type="number" min="0" step="0.01" className="mt-2" value={form.monthly_fixed_costs} onChange={(e) => setForm({ ...form, monthly_fixed_costs: e.target.value })} /></div></div><div className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground" aria-live="polite">{message}</p><Button type="submit"><Save className="mr-2 h-4 w-4" /> {copy.save}</Button></div></form></div></main>
}

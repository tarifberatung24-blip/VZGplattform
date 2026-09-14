import { redirect } from "next/navigation"
import { FinancialEducationPage } from "@/components/finance/financial-education-page"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export default async function FinanzbildungPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/finanzbildung")
  const householdId = await ensureHousehold(supabase)
  const [profileResult, lessonsResult, contractsResult] = await Promise.all([
    supabase.from("profiles").select("locale,completeness").eq("id", user.id).maybeSingle(),
    supabase.from("financial_education_lessons").select("id,slug,level,category,title,summary,content,context_key,source_reference").eq("status", "published").order("sort_order", { ascending: true }).limit(50),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("household_id", householdId),
  ])
  const locale = profileResult.data?.locale === "de" ? "de" : "bg"
  const lessons = (lessonsResult.data ?? []).filter((lesson) => lesson.slug.endsWith(`-${locale}`))
  return <FinancialEducationPage lessons={lessons} locale={locale} profileCompleteness={profileResult.data?.completeness ?? 0} contractCount={contractsResult.count ?? 0} />
}

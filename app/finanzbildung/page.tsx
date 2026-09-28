import { redirect } from "next/navigation"
import { FinancialEducationPage } from "@/components/finance/financial-education-page"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { requestLocale } from "@/lib/i18n/server-locale"

export default async function FinanzbildungPage() {
  // The URL segment decides the language, matching every other route (see lib/i18n/server-locale).
  // Reading the profile locale here made `/bg/finanzbildung` render German content.
  const locale = await requestLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/finanzbildung")
  const householdId = await ensureHousehold(supabase)
  const [profileResult, lessonsResult, contractsResult] = await Promise.all([
    supabase.from("profiles").select("completeness").eq("id", user.id).maybeSingle(),
    supabase.from("financial_education_lessons").select("id,slug,level,category,title,summary,content,context_key,source_reference").eq("status", "published").order("sort_order", { ascending: true }).limit(50),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("household_id", householdId),
  ])
  const lessons = (lessonsResult.data ?? []).filter((lesson) => lesson.slug.endsWith(`-${locale}`))
  return <FinancialEducationPage lessons={lessons} locale={locale} profileCompleteness={profileResult.data?.completeness ?? 0} contractCount={contractsResult.count ?? 0} />
}

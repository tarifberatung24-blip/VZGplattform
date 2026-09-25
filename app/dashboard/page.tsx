import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { VzgDashboard } from "@/components/dashboard/vzg-dashboard"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { readOnboardingStep } from "@/lib/onboarding/profile"
import { onboardingPath } from "@/lib/onboarding/state"
import { LOCALE_COOKIE_KEY } from "@/lib/i18n/language-context"
import { isLocale, defaultLocale } from "@/lib/i18n/dictionaries"
import { createCaseEngine } from "@/lib/horizon/case"
import { resolveCaseModule } from "@/lib/horizon/case/module"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/dashboard")

  // Re-applied here, not only in the proxy: a user who has not finished
  // first-login onboarding must not reach the dashboard.
  //
  // The locale comes from the resolved route segment (proxy.ts sets x-locale),
  // not from the locale cookie. The cookie can be stale or reflect a previously
  // visited locale, and using it here sent a German visitor to /bg/onboarding/...
  // — a locale switch mid-flow. The route segment is what the user actually asked
  // for; the cookie fallback only covers a direct internal render.
  const routeLocale = (await headers()).get("x-locale")
  const storedLocale = (await cookies()).get(LOCALE_COOKIE_KEY)?.value
  const locale = isLocale(routeLocale) ? routeLocale : isLocale(storedLocale) ? storedLocale : defaultLocale
  const onboardingTarget = onboardingPath((await readOnboardingStep()).step, locale)
  if (onboardingTarget) redirect(onboardingTarget)

  const householdId = await ensureHousehold(supabase)
  const engine = await createCaseEngine()
  const [profileResult, contractsResult, documentsResult, reviewDocumentsResult, deadlinesResult, casesResult, errorParam] = await Promise.all([
    supabase.from("profiles").select("completeness,employment_status,household_size,monthly_income,monthly_fixed_costs").eq("id", user.id).maybeSingle(),
    supabase.from("contracts").select("id,title,category,provider_name,monthly_amount,status,created_at,end_date,cancellation_deadline,review_status").eq("household_id", householdId).order("created_at", { ascending: false }).limit(100),
    supabase.from("documents").select("id,original_filename,processing_status,created_at,size_bytes").eq("household_id", householdId).order("created_at", { ascending: false }).limit(6),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("household_id", householdId).eq("processing_status", "needs_review"),
    supabase.from("deadlines").select("id,title,due_at,status,created_at").eq("user_id", user.id).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
    engine.repository ? engine.repository.listMine(100) : Promise.resolve({ data: [], error: null }),
    searchParams ? searchParams : Promise.resolve({} as { error?: string }),
  ])

  // Counted by resolved module, so a pre-P5 row without `horizon_module` is
  // attributed through its legacy intent instead of being silently dropped.
  const caseCounts: Record<string, number> = {}
  for (const item of casesResult.data ?? []) {
    const key = resolveCaseModule(item)
    caseCounts[key] = (caseCounts[key] ?? 0) + 1
  }

  return <VzgDashboard
    firstName={user.user_metadata?.first_name}
    profile={profileResult.data}
    contracts={contractsResult.data ?? []}
    documents={documentsResult.data ?? []}
    reviewCount={reviewDocumentsResult.count ?? 0}
    reminders={deadlinesResult.data ?? []}
    caseCounts={caseCounts}
    moduleError={errorParam.error ?? null}
  />
}

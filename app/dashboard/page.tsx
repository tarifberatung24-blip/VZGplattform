import { redirect } from "next/navigation"
import { VzgDashboard } from "@/components/dashboard/vzg-dashboard"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/dashboard")

  const { module: selectedModule } = await searchParams
  const householdId = await ensureHousehold(supabase)
  const [profileResult, contractsResult, documentsResult, reviewDocumentsResult, deadlinesResult] = await Promise.all([
    supabase.from("profiles").select("completeness,employment_status,household_size,monthly_income,monthly_fixed_costs").eq("id", user.id).maybeSingle(),
    supabase.from("contracts").select("id,title,category,provider_name,monthly_amount,status,created_at,end_date,cancellation_deadline,review_status").eq("household_id", householdId).order("created_at", { ascending: false }).limit(100),
    supabase.from("documents").select("id,original_filename,processing_status,created_at,size_bytes").eq("household_id", householdId).order("created_at", { ascending: false }).limit(6),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("household_id", householdId).eq("processing_status", "needs_review"),
    supabase.from("deadlines").select("id,title,due_at,status,created_at").eq("user_id", user.id).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
  ])

  return <VzgDashboard
    firstName={user.user_metadata?.first_name}
    profile={profileResult.data}
    contracts={contractsResult.data ?? []}
    documents={documentsResult.data ?? []}
    reviewCount={reviewDocumentsResult.count ?? 0}
    reminders={deadlinesResult.data ?? []}
    selectedModule={selectedModule}
  />
}

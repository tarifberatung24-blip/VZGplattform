import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { PersonalDashboard } from "@/components/finance/personal-dashboard"

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const householdId = await ensureHousehold(supabase)
  const [{ data: profile }, contracts, documents] = await Promise.all([
    supabase.from("profiles").select("completeness").eq("id", user.id).maybeSingle(),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("household_id", householdId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("household_id", householdId),
  ])

  return <PersonalDashboard firstName={user.user_metadata?.first_name} stats={{ contracts: contracts.count ?? 0, documents: documents.count ?? 0, profileCompleteness: profile?.completeness ?? 0 }} />
}

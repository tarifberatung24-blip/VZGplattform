import { redirect } from "next/navigation"
import { BusinessConsultantDashboard } from "@/components/business/business-consultant-dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function BusinessWorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/business")

  return <BusinessConsultantDashboard />
}

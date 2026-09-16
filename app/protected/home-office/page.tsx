import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeOfficeWorkspace } from "@/components/finance/home-office-workspace"

export default async function HomeOfficePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <HomeOfficeWorkspace />
}

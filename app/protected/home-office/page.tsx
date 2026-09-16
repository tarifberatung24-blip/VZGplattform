import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeOfficeWorkspace } from "@/components/finance/home-office-workspace"

export const metadata = {
  title: "Bescheid анализ",
  description: "Качи писмо от Finanzamt, Jobcenter или Familienkasse и получи предварителен screening на български.",
}

export default async function HomeOfficePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <HomeOfficeWorkspace />
}

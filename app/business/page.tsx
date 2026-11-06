import { redirect } from "next/navigation"
import { BusinessProfileForm } from "@/components/business/business-profile-form"
import { requestLocale } from "@/lib/i18n/server-locale"
import { createClient } from "@/lib/supabase/server"

export default async function BusinessWorkspacePage() {
  const locale = await requestLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/business")

  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <BusinessProfileForm
        locale={locale}
        initialProfile={data}
        schemaReady={!error || (error.code !== "42P01" && error.code !== "PGRST205")}
      />
    </main>
  )
}

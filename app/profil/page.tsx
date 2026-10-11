import { redirect } from "next/navigation"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/finance/profile-form"
import { JourneyRecordingCard } from "@/components/journey/recording-card"
import { isJourneyRecordingEnabled } from "@/lib/journey/recording"
import { requestLocale } from "@/lib/i18n/server-locale"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const [{ data: profile }, recordingEnabled, locale] = await Promise.all([
    supabase.from("profiles").select("employment_status,household_size,monthly_income,monthly_fixed_costs,completeness").eq("id", user.id).maybeSingle(),
    isJourneyRecordingEnabled(user.id),
    requestLocale(),
  ])
  return (
    <WorkspacePage>
      <ProfileForm userId={user.id} initialProfile={profile} />
      <JourneyRecordingCard initialEnabled={recordingEnabled} locale={locale} />
    </WorkspacePage>
  )
}

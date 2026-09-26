import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeOfficeWorkspace } from "@/components/finance/home-office-workspace"

/**
 * Authenticated AI home-office workspace. Reachable at `/{locale}/assistant` (the localized
 * catch-all re-exports this page) and at `/assistant`.
 *
 * This is the canonical home of the surface that previously lived at
 * `/{locale}/protected/home-office`; that legacy path now redirects here (see
 * `lib/navigation/legacy-redirects.ts`). It is not in the primary navigation, but it is a live
 * destination: `/{locale}/vertraege` and the dashboard link to it, so it must stay reachable.
 */
export default async function AssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return <HomeOfficeWorkspace />
}

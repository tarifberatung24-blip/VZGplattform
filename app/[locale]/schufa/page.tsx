import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SchufaWorkspace } from "@/components/schufa/schufa-workspace"

export const metadata: Metadata = {
  title: "Шуфа помощ | HORIZON by VZG",
  description:
    "Безплатна SCHUFA справка, качване в платформата и план за възстановяване на платежоспособността. / Kostenlose SCHUFA-Auskunft, Upload und ein Sanierungsplan.",
}

/**
 * The authenticated SCHUFA workspace.
 *
 * Behind the authentication boundary: the user uploads a personal credit report
 * and the plan is derived from it, so it belongs inside the workspace shell like
 * every other case surface.
 */
export default async function SchufaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/schufa")
  return (
    <main className="relative min-h-screen text-foreground">
      <SchufaWorkspace />
    </main>
  )
}

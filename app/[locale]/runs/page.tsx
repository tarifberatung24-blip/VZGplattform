import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { RunConsole } from "@/components/horizon/run-console"
import { createClient } from "@/lib/supabase/server"
import { isLocale, defaultLocale } from "@/lib/i18n/dictionaries"
import { localizedLoginPath } from "@/lib/supabase/auth-routing"

export const metadata: Metadata = {
  title: "Конзола за изпълнения | HORIZON by VZG",
  description:
    "Наблюдение на agent runs: статус, стъпки, опити и грешки. / Überwachung der Agent Runs: Status, Schritte, Versuche und Fehler.",
}

/**
 * The authenticated Operator Run Console.
 *
 * Behind the authentication boundary like every other case surface: it reads
 * owner-scoped run state through the existing `/api/horizon/agent-runs` routes,
 * which filter by `owner_id` and never expose another tenant's runs. No second
 * run store is created — this page only reads the engine's existing API.
 */
export default async function RunsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(localizedLoginPath(locale, `/${locale}/runs`))

  return <RunConsole />
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MfaSettings } from "@/components/auth/mfa-settings"
import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { createClient } from "@/lib/supabase/server"
import { requestLocale } from "@/lib/i18n/server-locale"

/**
 * The canonical authenticated Account Security surface, under the Konto/Профил group next to
 * Profil. It is the destination of the `security` navigation entry.
 *
 * The MFA functionality is the existing `MfaSettings` client component; no authentication logic,
 * Supabase behaviour, API or schema is changed. The legacy `/{locale}/protected/security` route
 * redirects here (see `lib/navigation/legacy-redirects.ts`).
 *
 * The public trust page stays at `/{locale}/security` and is a different surface.
 */
export default async function AccountSecurityPage() {
  const locale = await requestLocale()
  const de = locale === "de"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/konto/sicherheit")

  return (
    <WorkspacePage>
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="size-4" /> {de ? "Zum Dashboard" : "Към таблото"}</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">{de ? "Kontosicherheit" : "Сигурност на профила"}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{de ? "Verwalte den zusätzlichen Schutz beim Login. Die Einrichtung ist freiwillig und empfohlen." : "Управлявай допълнителната защита при вход. Настройката е доброволна и препоръчителна."}</p>
        <section className="kintex-panel mt-8 p-6" aria-labelledby="mfa-title">
          <h2 id="mfa-title" className="text-xl font-semibold text-foreground">{de ? "Zwei-Faktor-Authentifizierung (2FA)" : "Двуфакторна автентикация (2FA)"}</h2>
          <MfaSettings />
        </section>
      </div>
    </WorkspacePage>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MfaSettings } from "@/components/auth/mfa-settings"
import { createClient } from "@/lib/supabase/server"

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/konto/sicherheit")

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="size-4" /> Към таблото</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground">Сигурност на профила</h1>
        <p className="mt-3 leading-7 text-muted-foreground">Управлявай допълнителната защита при вход. Настройката е доброволна и препоръчителна.</p>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6" aria-labelledby="mfa-title">
          <h2 id="mfa-title" className="text-xl font-semibold text-foreground">Двуфакторна автентикация (2FA)</h2>
          <MfaSettings />
        </section>
      </div>
    </main>
  )
}

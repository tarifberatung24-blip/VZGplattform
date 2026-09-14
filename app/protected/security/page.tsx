import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MfaSettings } from "@/components/auth/mfa-settings"
import { createClient } from "@/lib/supabase/server"

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/protected/security")

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/protected" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><ArrowLeft className="size-4" /> Към таблото</Link>
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

import { redirect } from "next/navigation"
import { FinanzamtRequestForm } from "@/components/finance/finanzamt-request-form"
import { createClient } from "@/lib/supabase/server"
import { requestLocale } from "@/lib/i18n/server-locale"

export default async function Page() {
  const locale = await requestLocale()
  const de = locale === "de"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  return (
    <main className="min-h-screen bg-background px-4 pb-12 pt-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">HORIZON · Finanzamt</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{de ? "Finanzamt-Kommunikation" : "Комуникация с данъчната служба"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{de ? "Bereite eine Nachricht an das Finanzamt vor. Es wird nichts ohne deine ausdrückliche Handlung versendet." : "Подготви съобщение до данъчната служба. Нищо не се изпраща без твоето изрично действие."}</p>
        </header>
        <FinanzamtRequestForm />
      </div>
    </main>
  )
}

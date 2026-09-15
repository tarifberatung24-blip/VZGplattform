import { redirect } from "next/navigation"
import { FinanceModulePage } from "@/components/finance/module-page"
import { TaxForm } from "@/components/tax/TaxForm"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/steuer")

  return (
    <main className="min-h-screen bg-background">
      <FinanceModulePage
        title="Steuererklärung"
        description="Erfasse berufliche Situation und abzugsfähige Ausgaben in drei Schritten — vor dem Speichern prüfen."
        items={[
          "Berufliche Situation wählen",
          "Werbungskosten und Ausgaben erfassen",
          "Summe prüfen und speichern",
          "Keine automatische Steuerberechnung ohne Prüfung",
        ]}
      />
      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-10">
        <TaxForm />
      </div>
    </main>
  )
}

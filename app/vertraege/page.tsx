import { FinanceModulePage } from "@/components/finance/module-page"
import { ContractsWorkspace } from "@/components/finance/contracts-workspace"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { redirect } from "next/navigation"

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/vertraege")
  const householdId = await ensureHousehold(supabase)
  const { data: contracts, error } = await supabase.from("contracts").select("id,title,category,provider:provider_name,monthly_cost:monthly_amount,status").eq("household_id", householdId).order("created_at", { ascending: false })
  return <main className="min-h-screen bg-background"><FinanceModulePage title="Verträge prüfen" description="Erkenne laufende Kosten und mögliche Einsparpotenziale in deinen Verträgen." items={["Verträge und Anbieter erfassen", "Monatliche Kosten sichtbar machen", "Auffällige Laufzeiten und Kündigungsfristen markieren", "Mögliche Einsparungen als nächste Schritte festhalten"]} /><div className="mx-auto -mt-10 max-w-3xl px-4 pb-10"><ContractsWorkspace householdId={householdId} initialContracts={contracts ?? []} loadError={error ? "Verträge konnten nicht geladen werden." : null} /></div></main>
}

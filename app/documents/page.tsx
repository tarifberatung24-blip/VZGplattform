import { redirect } from "next/navigation"
import { FinanceModulePage } from "@/components/finance/module-page"
import { DocumentsWorkspace } from "@/components/finance/documents-workspace"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/documents")
  const householdId = await ensureHousehold(supabase)
  const { data: documents, error } = await supabase
    .from("documents")
    .select("id,original_filename,mime_type,size_bytes,processing_status,created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })

  return (
    <main>
      <FinanceModulePage title="Dokumente" description="Organisiere wichtige Unterlagen als Grundlage für deine Finanzthemen." items={["Dokumente sicher speichern", "Status von AI-Prüfungen sehen", "Unterlagen nach Haushalt trennen", "Bereit für die nächste Prüfung bleiben"]} />
      <div className="mx-auto -mt-10 max-w-4xl px-4 pb-10 sm:px-6 lg:px-8"><DocumentsWorkspace initialDocuments={documents ?? []} loadError={error ? "Dokumente konnten nicht geladen werden." : null} /></div>
    </main>
  )
}

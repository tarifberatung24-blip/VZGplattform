import { WorkspacePage } from "@/components/layout/workspace-page-header"
import { redirect } from "next/navigation"
import { FinanceModulePage } from "@/components/finance/module-page"
import { DocumentsWorkspace } from "@/components/finance/documents-workspace"
import { createClient } from "@/lib/supabase/server"
import { ensureHousehold } from "@/lib/supabase/household"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { requestLocale } from "@/lib/i18n/server-locale"

export default async function Page() {
  const text = getDictionary(await requestLocale()).cleanup
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
    <WorkspacePage>
      <FinanceModulePage title={text.documents.title} description={text.documents.description} items={text.documents.items} />
      <div className="mt-6"><DocumentsWorkspace initialDocuments={documents ?? []} loadError={error ? text.documents.loadError : null} /></div>
    </WorkspacePage>
  )
}

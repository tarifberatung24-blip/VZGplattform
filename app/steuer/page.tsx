import { redirect } from "next/navigation"
import { FinanceModulePage } from "@/components/finance/module-page"
import { TaxFormRegistry } from "@/components/finance/tax-form-registry"
import { TaxQuestionnaire } from "@/components/finance/tax-questionnaire"
import { createClient } from "@/lib/supabase/server"
import { buildCanonicalTaxReturn } from "@/lib/tax-pipeline"
import { TaxPipelineReview } from "@/components/finance/tax-pipeline-review"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: forms } = await supabase
    .from("tax_form_registry")
    .select("official_name,form_identifier,tax_year,form_version,required_or_conditional,verification_status,mapping_status,technical_pdf_status,official_source,official_file,registry_status,source_retrieval_status,source_id")
    .eq("tax_year", 2025)
    .order("required_or_conditional", { ascending: true })
    .order("official_name", { ascending: true })
  const { data: taxCase } = await supabase
    .from("tax_cases")
    .select("id,status,data")
    .eq("user_id", user.id)
    .eq("tax_year", 2025)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const initialAnswers = taxCase?.data && typeof taxCase.data === "object" && "questionnaire_answers" in taxCase.data
    ? (taxCase.data as { questionnaire_answers?: Record<string, unknown> }).questionnaire_answers ?? {}
    : {}

  const canonical = buildCanonicalTaxReturn(initialAnswers)
  return <main className="min-h-screen bg-background"><FinanceModulePage title="Steuererklärung" description="Sammle deine steuerrelevanten Informationen und erkenne fehlende Angaben." items={["Persönliche Situation und Steuerjahr erfassen", "Werbungskosten und abzugsfähige Ausgaben sammeln", "Belege sicher zuordnen", "Ergebnis vor dem Einreichen prüfen"]} /><div className="mx-auto -mt-10 max-w-3xl px-4 pb-10"><TaxQuestionnaire initialCase={taxCase ? { id: taxCase.id, answers: initialAnswers, status: taxCase.status } : null} /><TaxPipelineReview canonical={canonical} /><TaxFormRegistry forms={forms ?? []} /></div></main>
}

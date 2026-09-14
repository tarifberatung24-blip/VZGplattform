import { redirect } from "next/navigation"
import { ElsterReviewPackage } from "@/components/finance/elster-review-package"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: taxCase } = await supabase.from("tax_cases").select("data").eq("user_id", user.id).eq("tax_year", 2025).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  const answers = taxCase?.data && typeof taxCase.data === "object" && "questionnaire_answers" in taxCase.data ? (taxCase.data as { questionnaire_answers?: Record<string, unknown> }).questionnaire_answers ?? {} : {}
  return <main className="min-h-screen bg-background px-4 pb-12 pt-8"><div className="mx-auto max-w-3xl"><ElsterReviewPackage unresolvedFields={Object.values(answers).filter((value) => !String(value ?? "").trim()).length} /></div></main>
}

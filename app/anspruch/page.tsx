import { redirect } from "next/navigation"
import { FinanceModulePage } from "@/components/finance/module-page"
import { BenefitsQuiz } from "@/components/benefits/BenefitsQuiz"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/anspruch")

  return (
    <main className="min-h-screen bg-background">
      <FinanceModulePage
        title="Ansprüche prüfen"
        description="Beantworte kurze Ja/Nein-Fragen und erhalte eine strukturierte Vorprüfung zu Kindergeld, Wohngeld, Bürgergeld und weiteren Leistungen."
        items={[
          "Lebenssituation in Ja/Nein-Schritten erfassen",
          "Regelbasierte Orientierung zu staatlichen Leistungen",
          "Ergebnis mit Begründung und offiziellen Links",
          "Keine Zusage und keine Euro-Berechnung",
        ]}
      />
      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-10 sm:px-6 lg:px-8">
        <BenefitsQuiz />
      </div>
    </main>
  )
}

import { InkassoWizard } from "@/components/inkasso/inkasso-wizard"

/**
 * Inkasso-Check wizard.
 *
 * The route segment stays German in both locales because "pruefung" is the term
 * a user in Germany will look for; the page itself is localised.
 */
export default function InkassoPruefungPage() {
  return (
    <main className="relative min-h-screen text-foreground">
      <InkassoWizard />
    </main>
  )
}

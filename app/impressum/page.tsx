import { Mail, Phone } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { legalAddress, legalProfile } from "@/lib/legal-profile"

export default async function ImpressumPage() {
  const requestHeaders = await headers()
  const locale = requestHeaders.get("x-locale") === "de" ? "de" : "bg"
  const isBg = locale === "bg"
  const address = legalAddress()

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <Link
          href={`/${locale}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {isBg ? "Към началото" : "Zur Startseite"}
        </Link>

        <article className="flex flex-col gap-8 rounded-md border border-border px-6 py-8">
          <header className="flex flex-col gap-3">
            <p className="text-sm font-medium text-primary">
              {isBg ? "Правна информация" : "Rechtliche Informationen"}
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight">
              {isBg ? "Импресум" : "Impressum"}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {isBg
                ? "Законно необходимите данни за сайта и носителя на отговорност."
                : "Gesetzlich vorgeschriebene Angaben zu diesem Angebot und zur verantwortlichen Stelle."}
            </p>
          </header>

          <section className="flex flex-col gap-4 border-t border-border pt-6">
            <h2 className="text-xl font-semibold">
              {isBg ? "Данни за доставчика" : "Angaben zum Anbieter"}
            </h2>

            <div className="flex flex-col gap-4 rounded-md border border-border bg-muted p-5">
              {address.length > 0 && (
                <address className="not-italic leading-relaxed text-muted-foreground">
                  {address.map((line) => (
                    <span className="block" key={line}>
                      {line}
                    </span>
                  ))}
                </address>
              )}

              <div className="grid gap-3 text-sm">
                {legalProfile.email && (
                  <a
                    className="flex items-center gap-2 text-primary hover:underline"
                    href={`mailto:${legalProfile.email}`}
                  >
                    <Mail className="size-4" />
                    {legalProfile.email}
                  </a>
                )}
                {legalProfile.phone && (
                  <a
                    className="flex items-center gap-2 text-primary hover:underline"
                    href={`tel:${legalProfile.phone}`}
                  >
                    <Phone className="size-4" />
                    {legalProfile.phone}
                  </a>
                )}
              </div>

              {legalProfile.businessName && (
                <p className="text-sm text-muted-foreground">
                  {isBg ? "Наименование:" : "Unternehmen:"} {legalProfile.businessName}
                </p>
              )}
              {legalProfile.legalForm && (
                <p className="text-sm text-muted-foreground">
                  {isBg ? "Правна форма:" : "Rechtsform:"} {legalProfile.legalForm}
                </p>
              )}
              {legalProfile.representative && (
                <p className="text-sm text-muted-foreground">
                  {isBg ? "Собственик:" : "Inhaber:"} {legalProfile.representative}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {isBg
                  ? "VZG CONSULT е експертният бранд, а HORIZON by VZG е продукт на Tarifberater24."
                  : "VZG CONSULT ist die Expertenmarke; HORIZON by VZG ist ein Produkt von Tarifberater24."}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-xl font-semibold">
              {isBg ? "Отказ от отговорност" : "Haftungsausschluss"}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {isBg
                ? "Тази платформа предоставя информационни обяснения, преводи и преглед на документи. Предоставеното съдържание не представлява индивидуална данъчна, правна, финансова или друга професионална консултация. За важни решения, срокове и документи проверявайте оригиналите и при необходимост се консултирайте с квалифициран специалист."
                : "Diese Plattform stellt informationelle Erläuterungen, Übersetzungen und Dokumenten-Screenings bereit. Die bereitgestellten Inhalte sind keine zertifizierte steuerliche, rechtliche, finanzielle oder sonstige Fachberatung. Für wichtige Entscheidungen, Fristen und Dokumente sollten Sie stets eine zugelassene Fachkraft hinzuziehen und die Originalunterlagen prüfen."}
            </p>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <h2 className="text-xl font-semibold">
              {isBg ? "Контакт" : "Kontakt"}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {isBg
                ? "За въпроси и заявки използвайте посочения имейл адрес или телефон. Пощенският адрес е посочен по-горе."
                : "Für Anfragen nutzen Sie bitte die oben angegebene E-Mail-Adresse oder Telefonnummer. Die postalische Anschrift ist oben angegeben."}
            </p>
            <p className="text-sm text-muted-foreground">
              {isBg ? "Свържете се с нас:" : "Erreichbar unter:"} {legalProfile.email ? (
                <a className="text-primary hover:underline" href={`mailto:${legalProfile.email}`}>
                  {legalProfile.email}
                </a>
              ) : (
                "—"
              )}
            </p>
          </section>
        </article>
      </div>
    </main>
  )
}

"use client"

import { Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { legalAddress, legalProfile } from "@/lib/legal-profile"
import ContactForm from "./contact-form"

export default function ContactPage() {
  const { locale } = useLanguage()
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

        <div className="flex flex-col gap-6">
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
            {isBg ? "Контакт" : "Kontakt"}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {isBg
              ? "Свържете се с HORIZON by VZG. Използвайте формата по-долу или директно телефон и email."
              : "Treten Sie mit HORIZON by VZG in Kontakt. Nutzen Sie das Formular unten oder telefonisch bzw. per E-Mail."}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-6 rounded-md border border-border px-6 py-8">
            <h2 className="text-xl font-semibold">
              {isBg ? "Контактни данни" : "Kontaktdaten"}
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

              <p className="text-sm text-muted-foreground">
                <MapPin className="size-4 inline mr-2" />
                {isBg ? "България / Германия - Обслужване онлайн" : "Bulgarien / Deutschland - Online-Betreuung"}
              </p>
            </div>
          </section>

          <ContactForm locale={locale} />
        </div>
      </div>
    </main>
  )
}

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { EmailGeneratorForm } from "./email-generator-form"

export default function EmailGeneratorPage() {
  const { locale } = useLanguage()
  const isBg = locale === "bg"

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link
          href={`/${locale}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {isBg ? "Към началото" : "Zur Startseite"}
        </Link>

        <div className="flex flex-col gap-6">
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
            {isBg ? "Официално писмо — генератор" : "Offizieller Brief-Generator"}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {isBg
              ? "Опишете на български какво искате да кажете и изберете получател. Инструментът генерира официално немецко писмо с превод."
              : "Beschreiben Sie auf Bulgarisch, was Sie sagen möchten, und wählen Sie den Empfänger. Das Tool generiert einen formellen deutschen Brief mit Übersetzung."}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <EmailGeneratorForm locale={locale} />
        </div>
      </div>
    </main>
  )
}

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { EmailGeneratorForm } from "./email-generator-form"

export default function EmailGeneratorPage() {
  const { locale } = useLanguage()
  const isBg = locale === "bg"

  return (
    <main className="min-h-screen bg-background px-5 py-24 text-foreground sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <Link
          href={`/${locale}`}
          className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          {isBg ? "Към началото" : "Zur Startseite"}
        </Link>

        <div className="flex flex-col gap-6 border-b border-border pb-12">
          <h1 className="text-balance text-5xl font-black tracking-[-0.05em] md:text-7xl">
            {isBg ? "Официално писмо — генератор" : "Offizieller Brief-Generator"}
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
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

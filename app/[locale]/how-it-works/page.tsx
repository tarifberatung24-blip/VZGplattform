"use client"

import Link from "next/link"
import { CheckCircle2, CircleAlert, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"
import { localizedPath } from "@/lib/i18n/routing"

/**
 * Localized "how it works" page. Lives under app/[locale]/ so the i18n proxy
 * (proxy.ts) can resolve an unprefixed /how-it-works request to /<locale>/how-it-works.
 */
export default function HowItWorksPage() {
  const { locale, t } = useLanguage()
  const isBg = locale === "bg"

  const labels = isBg
    ? {
        back: "← Към началото",
        eyebrow: "KintexBG · BY VZG CONSULT",
        title: "Как работи",
        intro: "Три стъпки от първия въпрос до готов план за действие — без документи и без обвързване.",
        stepsTitle: "Твоят път",
        expected: "Какво получаваш",
        start: "Започни проверката",
        contact: "Свържи се с нас",
        notice: "Това е структурирана предварителна проверка.",
        disclaimer: "KintexBG не заменя данъчна, правна или социална консултация.",
      }
    : {
        back: "← Zur Startseite",
        eyebrow: "KintexBG · BY VZG CONSULT",
        title: "So funktioniert's",
        intro: "Drei Schritte von der ersten Frage bis zum fertigen Aktionsplan — ohne Dokumente und ohne Verpflichtung.",
        stepsTitle: "Dein Weg",
        expected: "Was du bekommst",
        start: "Prüfung starten",
        contact: "Kontakt aufnehmen",
        notice: "Dies ist eine strukturierte Vorprüfung.",
        disclaimer: "KintexBG ersetzt keine Steuer-, Rechts- oder Sozialberatung.",
      }

  const steps: [string, string][] = [
    [t.home.step1Title, t.home.step1Desc],
    [t.home.step2Title, t.home.step2Desc],
    [t.home.step3Title, t.home.step3Desc],
  ]

  const benefits = isBg
    ? [
        "Ясен преглед на твоите възможности — помощи, данъци и договори на едно място.",
        "Списък с нужните документи преди всяко заявление.",
        "Напомняния за срокове, които не бива да изпускаш.",
        "Всяка стъпка се проверява от човек, преди да предприемеш действие.",
      ]
    : [
        "Ein klarer Überblick über deine Möglichkeiten — Hilfen, Steuern und Verträge an einem Ort.",
        "Eine Liste der benötigten Unterlagen vor jedem Antrag.",
        "Erinnerungen an Fristen, die du nicht verpassen darfst.",
        "Jeder Schritt wird von einem Menschen geprüft, bevor du handelst.",
      ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8 md:py-24">
        <Link
          href={localizedPath("/", locale)}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {labels.back}
        </Link>

        <section className="mt-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{labels.eyebrow}</p>
          <h1 className="mt-6 text-balance text-4xl font-black tracking-[-0.05em] text-foreground md:text-6xl">
            {labels.title}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{labels.intro}</p>
        </section>

        <section className="mt-16" aria-labelledby="how-it-works-steps">
          <h2 id="how-it-works-steps" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {labels.stepsTitle}
          </h2>
          <ol className="mt-6 border-y border-border">
            {steps.map(([title, description], index) => (
              <li key={title} className="flex gap-6 border-b border-border p-8 last:border-b-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-sm font-black text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="how-it-works-benefits">
          <h2 id="how-it-works-benefits" className="text-xl font-black text-foreground">
            {labels.expected}
          </h2>
          <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-2">
            {benefits.map((item, index) => (
              <div key={item} className="flex items-start gap-4 bg-background p-6">
                <span className="flex size-8 shrink-0 items-center justify-center border border-border text-xs font-black text-primary">
                  {index + 1}
                </span>
                <div>
                  <CheckCircle2 className="mb-3 size-4 text-primary" />
                  <span className="text-sm leading-7 text-foreground">{item}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 border border-border bg-background p-5 text-sm leading-7 text-muted-foreground">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            <span>
              {labels.notice} {labels.disclaimer}
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="default">
              <Link href={localizedPath("/check", locale)}>
                {labels.start}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={localizedPath("/contact", locale)}>{labels.contact}</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
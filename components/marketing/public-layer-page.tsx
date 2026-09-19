"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { localizedPath } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"

type PublicLayerPageProps = { kind: "functions" | "security"; locale: Locale }

export function PublicLayerPage({ kind, locale }: PublicLayerPageProps) {
  const isBg = locale === "bg"
  const content = kind === "functions"
    ? isBg
      ? {
          eyebrow: "HORIZON by VZG",
          title: "Ясна помощ за административния живот в Германия.",
          intro: "HORIZON събира документи, срокове и следващи стъпки на едно спокойно място — с контрол във всеки момент.",
          items: [
            ["Документи на едно място", "Качи документ или опиши въпроса си, за да започнеш подредено."],
            ["Разбираеми следващи стъпки", "Получаваш структурирана ориентация, а не непроверени обещания."],
            ["Подготовка с твой контрол", "Преглеждаш всяка чернова и решаваш сам какво да изпратиш."],
          ],
          cta: "Създай профил",
          secondary: "Как работи",
        }
      : {
          eyebrow: "HORIZON by VZG",
          title: "Klare Hilfe für deinen Verwaltungsalltag in Deutschland.",
          intro: "HORIZON bündelt Dokumente, Fristen und nächste Schritte an einem ruhigen Ort — mit Kontrolle bei jedem Schritt.",
          items: [
            ["Dokumente an einem Ort", "Lade ein Dokument hoch oder beschreibe deine Frage, um strukturiert zu starten."],
            ["Verständliche nächste Schritte", "Du erhältst Orientierung statt ungeprüfter Versprechen."],
            ["Vorbereitung mit deiner Kontrolle", "Du prüfst jeden Entwurf und entscheidest selbst, was versendet wird."],
          ],
          cta: "Profil erstellen",
          secondary: "So funktioniert's",
        }
    : isBg
      ? {
          eyebrow: "Доверие и прозрачност",
          title: "Сигурността е част от всеки следващ ход.",
          intro: "HORIZON е създаден да помага с чувствителни документи и административни въпроси, без да отнема контрола от теб.",
          items: [
            ["Контрол от потребителя", "Нищо не се изпраща автоматично. Ти преглеждаш и одобряваш всяко действие."],
            ["Ясно разделение", "Публичната информация за сигурност е отделна от настройките за сигурност на профила."],
            ["Минимално и отговорно", "Използваме необходимия контекст и не представяме HORIZON като заместител на професионален съвет."],
          ],
          cta: "Регистрация",
          secondary: "Свържи се с нас",
        }
      : {
          eyebrow: "Vertrauen und Transparenz",
          title: "Sicherheit gehört zu jedem nächsten Schritt.",
          intro: "HORIZON unterstützt dich bei sensiblen Dokumenten und Verwaltungsfragen, ohne dir die Kontrolle abzunehmen.",
          items: [
            ["Kontrolle durch dich", "Nichts wird automatisch versendet. Du prüfst und bestätigst jede Aktion."],
            ["Klare Trennung", "Öffentliche Sicherheitsinformationen sind von den Kontosicherheitseinstellungen getrennt."],
            ["Verantwortungsvoll und fokussiert", "Wir verwenden den notwendigen Kontext und ersetzen keine professionelle Beratung."],
          ],
          cta: "Registrieren",
          secondary: "Kontakt aufnehmen",
        }

  const icons = kind === "functions" ? [Sparkles, CheckCircle2, ArrowRight] : [LockKeyhole, ShieldCheck, CheckCircle2]
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8 md:py-24">
        <Link href={localizedPath("/", locale)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {isBg ? "← Към началото" : "← Zur Startseite"}
        </Link>
        <section className="mt-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{content.eyebrow}</p>
          <h1 className="mt-6 text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl">{content.title}</h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{content.intro}</p>
        </section>
        <section className="mt-16 grid gap-px border border-border bg-border md:grid-cols-3" aria-label={content.eyebrow}>
          {content.items.map(([title, description], index) => {
            const Icon = icons[index]
            return <article key={title} className="bg-background p-7 md:p-8">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">0{index + 1}</p>
              <h2 className="mt-3 text-xl font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
            </article>
          })}
        </section>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href={localizedPath("/auth/sign-up", locale)}>{content.cta}<ArrowRight className="ml-1 size-4" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link href={localizedPath(kind === "functions" ? "/how-it-works" : "/contact", locale)}>{content.secondary}</Link></Button>
        </div>
      </div>
    </main>
  )
}

export function FunctionsPage({ locale }: { locale: Locale }) { return <PublicLayerPage kind="functions" locale={locale} /> }
export function PublicSecurityPage({ locale }: { locale: Locale }) { return <PublicLayerPage kind="security" locale={locale} /> }

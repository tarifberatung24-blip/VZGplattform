"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { localizedPath } from "@/lib/i18n/routing"
import type { Locale } from "@/lib/i18n/dictionaries"
import { BrandText } from "@/components/brand/horizon-wordmark"

type PublicLayerPageProps = { kind: "functions" | "security"; locale: Locale }

export function PublicLayerPage({ kind, locale }: PublicLayerPageProps) {
  const isBg = locale === "bg"
  const content = kind === "functions"
    ? isBg
      ? {
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
    <main className="relative min-h-screen text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 pt-28 pb-16 lg:px-8 md:pt-32 md:pb-24">
        <Link href={localizedPath("/", locale)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {isBg ? "← Към началото" : "← Zur Startseite"}
        </Link>
        <section className="mt-10 max-w-3xl">
          <h1 className="text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl">{content.title}</h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground"><BrandText text={content.intro} /></p>
        </section>
        <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label={content.title}>
          {content.items.map(([title, description], index) => {
            const Icon = icons[index]
            return <article key={title} className="glass-card flex h-full items-start gap-4 rounded-sm p-7 backdrop-blur-md md:p-8">
              <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">0{index + 1}</span>
                  <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground"><BrandText text={description} /></p>
              </div>
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

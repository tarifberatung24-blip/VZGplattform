import Link from "next/link"
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react"
import type { Locale } from "@/lib/i18n/dictionaries"
import { localizedPath } from "@/lib/i18n/routing"

type PublicSecurityPageProps = { locale: Locale }

export default function PublicSecurityPage({ locale }: PublicSecurityPageProps) {
  const isBg = locale === "bg"
  const items = isBg
    ? [
        ["Контрол от потребителя", "Нищо не се изпраща автоматично. Ти преглеждаш и одобряваш всяко действие."],
        ["Ясно разделение", "Публичната информация за сигурност е отделна от настройките за сигурност на профила."],
        ["Минимално и отговорно", "Използваме необходимия контекст и не представяме HORIZON като заместител на професионален съвет."],
      ]
    : [
        ["Kontrolle durch dich", "Nichts wird automatisch versendet. Du prüfst und bestätigst jede Aktion."],
        ["Klare Trennung", "Öffentliche Sicherheitsinformationen sind von den Kontosicherheitseinstellungen getrennt."],
        ["Verantwortungsvoll und fokussiert", "Wir verwenden den notwendigen Kontext und ersetzen keine professionelle Beratung."],
      ]
  const icons = [LockKeyhole, ShieldCheck, CheckCircle2]
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-8 md:py-24">
        <Link href={localizedPath("/", locale)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {isBg ? "← Към началото" : "← Zur Startseite"}
        </Link>
        <section className="mt-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{isBg ? "Доверие и прозрачност" : "Vertrauen und Transparenz"}</p>
          <h1 className="mt-6 text-balance text-4xl font-black tracking-[-0.05em] md:text-6xl">{isBg ? "Сигурността е част от всеки следващ ход." : "Sicherheit gehört zu jedem nächsten Schritt."}</h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{isBg ? "HORIZON е създаден да помага с чувствителни документи и административни въпроси, без да отнема контрола от теб." : "HORIZON unterstützt dich bei sensiblen Dokumenten und Verwaltungsfragen, ohne dir die Kontrolle abzunehmen."}</p>
        </section>
        <section className="mt-16 grid gap-px border border-border bg-border md:grid-cols-3">
          {items.map(([title, description], index) => {
            const Icon = icons[index]
            return <article key={title} className="bg-background p-7 md:p-8"><Icon className="size-5 text-primary" aria-hidden="true" /><p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">0{index + 1}</p><h2 className="mt-3 text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p></article>
          })}
        </section>
        <div className="mt-10 flex flex-wrap gap-3"><Link href={localizedPath("/auth/sign-up", locale)} className="inline-flex items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{isBg ? "Регистрация" : "Registrieren"}</Link><Link href={localizedPath("/contact", locale)} className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-semibold">{isBg ? "Свържи се с нас" : "Kontakt aufnehmen"}</Link></div>
      </div>
    </main>
  )
}

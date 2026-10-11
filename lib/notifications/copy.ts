import type { Locale } from "@/lib/i18n/dictionaries"
import type { FeatureId, NotificationKind, Report } from "./rules"

/**
 * Text for every notification, rendered from the stored facts in the reader's
 * language. Used by the in-app inbox and by the e-mail. Humanizer standard: no
 * em or en dashes, no exclamation marks, no invented numbers; savings come only
 * from the evidenced savings ledger.
 */

export type RenderedNotification = { title: string; body: string; href: string; cta: string }

const featureNames: Record<Locale, Record<FeatureId, string>> = {
  bg: {
    documents: "Документи",
    contracts: "Договори",
    letter_explained: "Обяснение на писмо",
    cancellation: "Прекратяване",
    tax: "Данъци",
    benefits: "Помощи и Jobcenter",
    tariff_compare: "Сравнение на тарифи",
    letter_sent: "Изпратено писмо",
  },
  de: {
    documents: "Dokumente",
    contracts: "Verträge",
    letter_explained: "Brief erklärt",
    cancellation: "Kündigung",
    tax: "Steuern",
    benefits: "Leistungen und Jobcenter",
    tariff_compare: "Tarifvergleich",
    letter_sent: "Brief versendet",
  },
}

export const inboxCopy: Record<
  Locale,
  {
    title: string
    empty: string
    markAll: string
    unread: (count: number) => string
    emailOn: string
    emailOff: string
    emailLabel: string
    emailFooter: string
    emailSignature: string
    showAll: (count: number) => string
    showLess: string
  }
> = {
  bg: {
    title: "Пощенска кутия",
    empty: "Още няма съобщения. Тук ще виждаш отчети и напомняния за сроковете си.",
    markAll: "Маркирай всички като прочетени",
    unread: (count) => (count === 1 ? "1 ново" : `${count} нови`),
    emailOn: "Имейл известията са включени",
    emailOff: "Имейл известията са изключени",
    emailLabel: "Получавай отчетите и напомнянията и по имейл",
    emailFooter: "Получаваш този имейл, защото имаш профил в HORIZON. Можеш да изключиш имейлите в Пощенската кутия на таблото.",
    emailSignature: "Екипът на HORIZON by VZG",
    showAll: (count) => `Покажи всички (${count})`,
    showLess: "Покажи по-малко",
  },
  de: {
    title: "Postfach",
    empty: "Noch keine Nachrichten. Hier siehst du Berichte und Erinnerungen an deine Fristen.",
    markAll: "Alle als gelesen markieren",
    unread: (count) => (count === 1 ? "1 neu" : `${count} neu`),
    emailOn: "E-Mail-Benachrichtigungen sind an",
    emailOff: "E-Mail-Benachrichtigungen sind aus",
    emailLabel: "Berichte und Erinnerungen auch per E-Mail erhalten",
    emailFooter: "Du bekommst diese E-Mail, weil du ein HORIZON-Profil hast. Du kannst die E-Mails im Postfach deines Dashboards abschalten.",
    emailSignature: "Dein Team von HORIZON by VZG",
    showAll: (count) => `Alle anzeigen (${count})`,
    showLess: "Weniger anzeigen",
  },
}

function money(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "bg" ? "bg-BG" : "de-DE", { style: "currency", currency: "EUR" }).format(cents / 100)
}

function date(value: string, locale: Locale): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parsed)
}

function num(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function str(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asReport(payload: Record<string, unknown>): Report {
  const features = Array.isArray(payload.featuresUsed) ? (payload.featuresUsed.filter((item) => typeof item === "string") as FeatureId[]) : []
  return {
    featuresUsed: features,
    featureTotal: num(payload.featureTotal) || 8,
    contracts: num(payload.contracts),
    documents: num(payload.documents),
    cases: num(payload.cases),
    sentLetters: num(payload.sentLetters),
    securedSavingsCents: num(payload.securedSavingsCents),
    realizedSavingsCents: num(payload.realizedSavingsCents),
    upcomingDeadlines: num(payload.upcomingDeadlines),
  }
}

function reportBody(report: Report, locale: Locale, options: { savingsLine?: boolean } = {}): string {
  const savingsLine = options.savingsLine !== false
  const names = featureNames[locale]
  const used = report.featuresUsed.map((feature) => names[feature]).filter(Boolean)
  const saved = report.securedSavingsCents + report.realizedSavingsCents
  if (locale === "de") {
    const lines = [
      `Genutzt: ${used.length} von ${report.featureTotal} Hauptfunktionen${used.length ? ` (${used.join(", ")})` : ""}.`,
      `Verträge: ${report.contracts}. Dokumente: ${report.documents}. Vorgänge: ${report.cases}. Versendete Briefe: ${report.sentLetters}.`,
      !savingsLine ? "" : saved > 0 ? `Belegte Ersparnis: ${money(saved, locale)} pro Jahr.` : "Noch keine belegte Ersparnis. Ein Vertrag reicht, um zu prüfen, ob du zu viel zahlst.",
      report.upcomingDeadlines > 0 ? `Fristen in den nächsten 30 Tagen: ${report.upcomingDeadlines}.` : "",
    ]
    return lines.filter(Boolean).join("\n")
  }
  const lines = [
    `Използвани: ${used.length} от ${report.featureTotal} основни функции${used.length ? ` (${used.join(", ")})` : ""}.`,
    `Договори: ${report.contracts}. Документи: ${report.documents}. Случаи: ${report.cases}. Изпратени писма: ${report.sentLetters}.`,
    !savingsLine ? "" : saved > 0 ? `Доказано спестяване: ${money(saved, locale)} годишно.` : "Още няма доказано спестяване. Един договор стига, за да проверим дали плащаш твърде много.",
    report.upcomingDeadlines > 0 ? `Срокове в следващите 30 дни: ${report.upcomingDeadlines}.` : "",
  ]
  return lines.filter(Boolean).join("\n")
}

export function renderNotification(kind: NotificationKind, payload: Record<string, unknown>, locale: Locale): RenderedNotification {
  const de = locale === "de"
  const dashboard = `/${locale}/dashboard`
  const contracts = `/${locale}/vertraege`

  switch (kind) {
    case "first_win": {
      const report = asReport(payload)
      const saved = report.securedSavingsCents + report.realizedSavingsCents
      return {
        title: de ? "Dein erster Erfolg mit HORIZON" : "Първият ти успех с HORIZON",
        body: [
          de
            ? saved > 0
              ? `Du sparst jetzt belegt ${money(saved, locale)} pro Jahr.`
              : "Dein Brief wurde erfolgreich versendet."
            : saved > 0
              ? `Вече спестяваш доказано ${money(saved, locale)} годишно.`
              : "Писмото ти беше изпратено успешно.",
          reportBody(report, locale, { savingsLine: saved === 0 }),
        ].join("\n"),
        href: dashboard,
        cta: de ? "Zum Dashboard" : "Към таблото",
      }
    }
    case "report_day14":
    case "report_monthly": {
      const report = asReport(payload)
      return {
        title:
          kind === "report_day14"
            ? de ? "Deine ersten 14 Tage mit HORIZON" : "Първите ти 14 дни с HORIZON"
            : de ? "Dein Monatsbericht von HORIZON" : "Месечният ти отчет от HORIZON",
        body: reportBody(report, locale),
        href: dashboard,
        cta: de ? "Bericht ansehen" : "Виж отчета",
      }
    }
    case "inactive_nudge":
      return {
        title: de ? "Ein Brief, drei Minuten" : "Едно писмо, три минути",
        body: de
          ? "Liegt bei dir ein deutscher Brief, eine Rechnung oder ein Vertrag? Fotografiere ihn und HORIZON erklärt dir auf Bulgarisch, was drinsteht, welche Frist gilt und was du tun kannst."
          : "Имаш ли немско писмо, сметка или договор? Снимай го и HORIZON ще ти обясни на български какво пише, какъв е срокът и какво можеш да направиш.",
        href: dashboard,
        cta: de ? "Brief hochladen" : "Качи писмо",
      }
    case "deadline_30":
    case "deadline_7": {
      const title = str(payload.title) || (de ? "Vertrag" : "Договор")
      const when = date(str(payload.date), locale)
      const daysLeft = num(payload.daysLeft)
      return {
        title: de ? `Frist für „${title}“ am ${when}` : `Срок за „${title}“ на ${when}`,
        body: de
          ? `${daysLeft <= 0 ? "Die Kündigungsfrist endet heute." : daysLeft === 1 ? "Noch 1 Tag bis zur Kündigungsfrist." : `Noch ${daysLeft} Tage bis zur Kündigungsfrist.`} Danach verlängert sich der Vertrag oft automatisch. Prüfe jetzt, ob ein günstigerer Tarif passt, oder lass HORIZON die Kündigung vorbereiten.`
          : `${daysLeft <= 0 ? "Срокът за прекратяване изтича днес." : daysLeft === 1 ? "Остава 1 ден до срока за прекратяване." : `Остават ${daysLeft} дни до срока за прекратяване.`} След него договорът често се подновява автоматично. Провери сега дали има по-изгоден тариф или остави HORIZON да подготви прекратяването.`,
        href: contracts,
        cta: de ? "Vertrag öffnen" : "Отвори договора",
      }
    }
  }
}

/** Plain-text e-mail for one notification. `origin` is the public site origin. */
export function renderNotificationEmail(
  kind: NotificationKind,
  payload: Record<string, unknown>,
  locale: Locale,
  origin: string,
): { subject: string; body: string } {
  const item = renderNotification(kind, payload, locale)
  const copy = inboxCopy[locale]
  return {
    subject: item.title,
    body: [item.body, "", `${item.cta}: ${origin}${item.href}`, "", copy.emailSignature, "", copy.emailFooter].join("\n"),
  }
}

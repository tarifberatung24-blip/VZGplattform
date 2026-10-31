/**
 * The searchable destination catalog.
 *
 * One list backs the header service finder, the dashboard quick entries and the
 * AI search's platform results, so the three surfaces cannot disagree about what
 * a service is called or where it lives. Each entry points at a real route; a
 * destination added here becomes reachable from every finder at once.
 */

import type { Locale } from "@/lib/i18n/dictionaries"

export type ServiceCatalogEntry = {
  id: string
  /** Unlocalized path. The caller prefixes the active locale. */
  href: string
  title: Record<Locale, string>
  detail: Record<Locale, string>
  /** Extra search words a person would actually type, per locale. */
  terms: Record<Locale, string>
}

export const serviceCatalog: readonly ServiceCatalogEntry[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    title: { bg: "Начало", de: "Übersicht" },
    detail: { bg: "Най-важните ти услуги", de: "Deine wichtigsten Dienste" },
    terms: { bg: "табло dashboard начало", de: "dashboard start home" },
  },
  {
    id: "guide",
    href: "/guide",
    title: { bg: "HORIZON Guide", de: "HORIZON Guide" },
    detail: { bg: "Помощ за личен случай", de: "Hilfe für einen persönlichen Vorgang" },
    terms: { bg: "помощ случай писмо отговор срок", de: "hilfe fall brief antwort frist" },
  },
  {
    id: "inkasso",
    href: "/pruefung",
    title: { bg: "Inkasso Check", de: "Inkasso-Check" },
    detail: { bg: "Провери писмо за Inkasso или Mahnbescheid", de: "Ein Inkasso- oder Mahnschreiben prüfen" },
    terms: { bg: "инкассо inkasso писмо mahnung mahnbescheid вземане", de: "inkasso mahnung mahnbescheid forderung gläubiger" },
  },
  {
    id: "learning-center",
    href: "/learning-center",
    title: { bg: "Учебен център", de: "Lernzentrum" },
    detail: { bg: "Функции, наръчник и готови писма по пътеки", de: "Funktionen, Ratgeber und Briefe in Lernpfaden" },
    terms: {
      bg: "учебен център обучение наръчник ratgeber готови писма vorlagen служби jobcenter finanzamt mängelanzeige widerspruch",
      de: "lernzentrum lernen ratgeber behörden vorlagen briefe jobcenter finanzamt mängelanzeige widerspruch",
    },
  },
  {
    id: "schufa",
    href: "/schufa",
    title: { bg: "Шуфа помощ", de: "SCHUFA-Hilfe" },
    detail: { bg: "Безплатна справка и план за подобряване", de: "Kostenlose Auskunft und Plan zur Verbesserung" },
    terms: { bg: "шуфа schufa кредитна история платежоспособност точки", de: "schufa bonität auskunft kredit score" },
  },
  {
    id: "email-generator",
    href: "/email-generator",
    title: { bg: "Подготви официално писмо", de: "Offiziellen Brief vorbereiten" },
    detail: { bg: "Немска чернова с разбираем превод", de: "Deutscher Entwurf mit verständlicher Übersetzung" },
    terms: { bg: "писмо отговор институция превод немски", de: "brief schreiben behörde antwort übersetzung" },
  },
  {
    id: "documents",
    href: "/documents",
    title: { bg: "Документи", de: "Dokumente" },
    detail: { bg: "Управлявай писма и документи", de: "Briefe und Unterlagen verwalten" },
    terms: { bg: "писмо качи документ pdf", de: "brief hochladen dokument pdf" },
  },
  {
    id: "contracts",
    href: "/vertraege",
    title: { bg: "Договори", de: "Verträge" },
    detail: { bg: "Договори и срокове", de: "Verträge und Fristen" },
    terms: { bg: "договор прекратяване разходи", de: "vertrag kündigung kosten" },
  },
  {
    id: "kosten-senken",
    href: "/kosten-senken",
    title: { bg: "Намаляване на разходи", de: "Kosten senken" },
    detail: { bg: "Проверка на ток, газ или отопление", de: "Strom-, Gas- oder Heizkosten prüfen lassen" },
    terms: { bg: "ток газ отопление разход спестяване проверка", de: "strom gas heizung kosten sparen prüfung" },
  },
  {
    id: "steuer",
    href: "/steuer",
    title: { bg: "Данъци", de: "Steuern" },
    detail: { bg: "Подготви данъчни документи", de: "Steuerunterlagen vorbereiten" },
    terms: { bg: "данък декларация finanzamt", de: "steuer steuererklärung finanzamt" },
  },
  {
    id: "assistant",
    href: "/assistant",
    title: { bg: "HORIZON асистент", de: "HORIZON Assistent" },
    detail: { bg: "Въпроси по потвърдените ти данни", de: "Fragen zu deinen bestätigten Daten" },
    terms: { bg: "асистент чатбот въпрос помощ", de: "assistent chatbot frage hilfe" },
  },
  {
    id: "forum",
    href: "/forum",
    title: { bg: "HORIZON Forum", de: "HORIZON Forum" },
    detail: { bg: "Въпроси и опит от общността", de: "Fragen und Erfahrungen teilen" },
    terms: { bg: "форум мнение въпрос тема", de: "forum frage meinung thema" },
  },
  {
    id: "finanzbildung",
    href: "/finanzbildung",
    title: { bg: "Финансово обучение", de: "Finanzbildung" },
    detail: { bg: "Разбери основите спокойно", de: "Grundlagen verständlich erklärt" },
    terms: { bg: "учене знания финанси", de: "lernen wissen finanzen" },
  },
  {
    id: "profile",
    href: "/profil",
    title: { bg: "Профил", de: "Profil" },
    detail: { bg: "Данни и настройки", de: "Angaben und Einstellungen" },
    terms: { bg: "акаунт настройки поверителност", de: "konto einstellungen datenschutz" },
  },
]

/** Substring filter over title, detail and terms. Empty query returns the whole catalog. */
export function filterServiceCatalog(query: string, locale: Locale): ServiceCatalogEntry[] {
  const term = query.trim().toLocaleLowerCase(locale)
  if (!term) return [...serviceCatalog]
  return serviceCatalog.filter((entry) =>
    `${entry.title[locale]} ${entry.detail[locale]} ${entry.terms[locale]}`
      .toLocaleLowerCase(locale)
      .includes(term),
  )
}

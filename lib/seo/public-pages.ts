import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Titles and descriptions for the public pages rendered by the localized catch-all.
 *
 * This table exists because of how those routes are built. `app/[locale]/[[...slug]]`
 * imports each page component and renders it as a child, so the page's own
 * `metadata` export is never consulted — only the catch-all's `generateMetadata`
 * runs. It returned `{}` for every public path, so all sixteen public pages shipped
 * the locale layout's default title: a search engine saw sixteen identical
 * documents, and a shared link showed no description of the actual page.
 *
 * A page's title belongs next to that page, so the entries stay here in one table
 * rather than being spread across the catch-all. The path keys match the `pages`
 * map in the catch-all exactly.
 */
export type PublicPageMeta = {
  title: Record<Locale, string>
  description: Record<Locale, string>
  keywords?: Record<Locale, string[]>
}

export const publicPageMeta: Readonly<Record<string, PublicPageMeta>> = {
  "": {
    title: {
      // The locale layout's title template appends "· HORIZON by VZG", so the brand
      // must not appear here or the home page would show it twice.
      bg: "Финансов и административен помощник за Германия",
      de: "Finanz- und Verwaltungsassistent für Deutschland",
    },
    description: {
      bg: "Разбери писмата от институциите, подготви отговори, следи срокове и договори. Двуезично, на български и немски, с твоето одобрение за всяко действие.",
      de: "Behördenbriefe verstehen, Antworten vorbereiten, Fristen und Verträge im Blick behalten. Zweisprachig, mit deiner Bestätigung für jede Aktion.",
    },
    keywords: {
      bg: ["българи в Германия", "писма от институции", "помощ Германия", "данъци Германия", "Kindergeld"],
      de: ["Behördenbrief verstehen", "Hilfe Deutschland", "Finanzassistent", "Steuererklärung", "Kindergeld"],
    },
  },
  contact: {
    title: { bg: "Контакт", de: "Kontakt" },
    description: {
      bg: "Пиши ни за въпроси, заявки или сътрудничество. Отговаряме на български и на немски.",
      de: "Schreib uns bei Fragen, Anfragen oder Zusammenarbeit. Wir antworten auf Bulgarisch und Deutsch.",
    },
  },
  kindergeld: {
    title: { bg: "Kindergeld — проверка на правото и подготовка на заявление", de: "Kindergeld – Anspruch prüfen und Antrag vorbereiten" },
    description: {
      bg: "Структурирана проверка за Kindergeld: кой има право, какви документи са нужни и как се подава заявлението в Familienkasse.",
      de: "Strukturierte Prüfung zum Kindergeld: wer anspruchsberechtigt ist, welche Unterlagen nötig sind und wie der Antrag bei der Familienkasse läuft.",
    },
    keywords: {
      bg: ["Kindergeld", "детски надбавки", "Familienkasse", "заявление Kindergeld"],
      de: ["Kindergeld", "Kindergeld beantragen", "Familienkasse", "Kinderzuschlag"],
    },
  },
  anspruch: {
    title: { bg: "Проверка на правото на помощи", de: "Ansprüche prüfen" },
    description: {
      bg: "Провери кои държавни помощи и облекчения отговарят на житейската ти ситуация — Kindergeld, Wohngeld, Bürgergeld и други.",
      de: "Prüfe, welche staatlichen Leistungen und Vergünstigungen zu deiner Lebenssituation passen – Kindergeld, Wohngeld, Bürgergeld und weitere.",
    },
    keywords: {
      bg: ["право на помощи", "Wohngeld", "Bürgergeld", "държавни помощи Германия"],
      de: ["Ansprüche", "Wohngeld", "Bürgergeld", "Sozialleistungen prüfen"],
    },
  },
  "za-nas": {
    title: { bg: "За нас", de: "Über uns" },
    description: {
      bg: "Кои сме ние, как работим и какъв е принципът: ти решаваш, ние подготвяме. Без автоматично изпращане.",
      de: "Wer wir sind, wie wir arbeiten und nach welchem Grundsatz: Du entscheidest, wir bereiten vor. Ohne automatischen Versand.",
    },
  },
  security: {
    title: { bg: "Сигурност и контрол", de: "Sicherheit und Kontrolle" },
    description: {
      bg: "Как пазим документите ти, какво правим с данните и защо нищо не се изпраща без твоето изрично одобрение.",
      de: "Wie wir deine Dokumente schützen, was mit den Daten passiert und warum nichts ohne deine ausdrückliche Bestätigung versendet wird.",
    },
    keywords: {
      bg: ["сигурност", "защита на данни", "GDPR", "контрол над данните"],
      de: ["Sicherheit", "Datenschutz", "DSGVO", "Datenkontrolle"],
    },
  },
  versicherungen: {
    title: { bg: "Застраховки", de: "Versicherungen" },
    description: {
      bg: "Застраховки за живота в Германия — фирмена и автомобилна. Сравнение и заявка, с ясно посочен партньор.",
      de: "Versicherungen für das Leben in Deutschland – Firmen- und Kfz-Versicherung. Vergleich und Anfrage mit klar benanntem Partner.",
    },
    keywords: {
      bg: ["застраховки Германия", "Kfz-Versicherung", "фирмена застраховка"],
      de: ["Versicherungen", "Kfz-Versicherung", "Firmenversicherung"],
    },
  },
  datenschutz: {
    title: { bg: "Политика за поверителност", de: "Datenschutzerklärung" },
    description: {
      bg: "Как събираме, използваме и пазим личните ти данни, на какво основание и какви са правата ти.",
      de: "Wie wir personenbezogene Daten erheben, nutzen und schützen, auf welcher Rechtsgrundlage und welche Rechte du hast.",
    },
  },
  agb: {
    title: { bg: "Общи условия", de: "Allgemeine Geschäftsbedingungen" },
    description: {
      bg: "Условията за ползване на HORIZON by VZG: обхват на услугата, отговорности и ред.",
      de: "Nutzungsbedingungen für HORIZON by VZG: Leistungsumfang, Verantwortlichkeiten und Ablauf.",
    },
  },
  impressum: {
    title: { bg: "Импресум", de: "Impressum" },
    description: {
      bg: "Законно необходимите данни за сайта и носителя на отговорност.",
      de: "Gesetzlich vorgeschriebene Angaben zu diesem Angebot und zur verantwortlichen Stelle.",
    },
  },
  widerruf: {
    title: { bg: "Право на отказ", de: "Widerrufsrecht" },
    description: {
      bg: "Как можеш да се откажеш от услугата и какви са сроковете и последиците.",
      de: "Wie du die Leistung widerrufen kannst und welche Fristen und Folgen gelten.",
    },
  },
  "affiliate-hinweis": {
    title: { bg: "Бележка за партньорски връзки", de: "Affiliate-Hinweis" },
    description: {
      bg: "Ясно посочваме къде има партньорска връзка и как това влияе — или не влияе — на препоръките.",
      de: "Wir benennen klar, wo eine Partnerbeziehung besteht und wie sie Empfehlungen beeinflusst – oder nicht.",
    },
  },
  "service-center": {
    title: { bg: "Услуги на HORIZON", de: "Leistungen von HORIZON" },
    description: {
      bg: "Всички услуги на HORIZON на едно място: какво работи веднага, какво иска вход, какво зависи от партньор и какво тепърва предстои. Филтрирай по категория или търси по име.",
      de: "Alle Leistungen von HORIZON an einem Ort: was sofort funktioniert, was eine Anmeldung braucht, was von einem Partner abhängt und was erst geplant ist. Filtere nach Kategorie oder suche nach Namen.",
    },
    keywords: {
      bg: ["услуги HORIZON", "какво може HORIZON", "функции", "документи", "данъци", "договори"],
      de: ["HORIZON Leistungen", "was HORIZON kann", "Funktionen", "Dokumente", "Steuern", "Verträge"],
    },
  },
}

export function publicPageMetaFor(path: string): PublicPageMeta | undefined {
  return publicPageMeta[path]
}

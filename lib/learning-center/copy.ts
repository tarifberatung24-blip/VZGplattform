import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Copy for the HORIZON Learning Center.
 *
 * The page itself is assembled from three existing corpora (the 16 services, the
 * guide topics and the letter templates) plus one Coming Soon path, so nothing
 * here duplicates a service, a guide or a letter. This module carries only the
 * page frame: the four path titles, the section headings, the honesty labels and
 * the notice.
 */

export type LearningPathId = "functions" | "guides" | "letters" | "dashboard"

export type LearningPath = {
  id: LearningPathId
  /** The two-digit number shown on the path marker. */
  number: string
  /** The anchor id, so the legacy redirects can deep-link into a path. */
  anchor: string
  title: string
  tagline: string
  /** The "start here" sentence that turns a topic into a step. */
  start: string
}

export type ComingSoonLesson = {
  title: string
  body: string
}

export type LearningCenterCopy = {
  back: string
  eyebrow: string
  title: string
  intro: string
  /** How to use the page: three short instructions, in order. */
  howToUse: [string, string, string]
  pathsTitle: string
  /** Shared labels reused by every path so the cards cannot drift apart. */
  openLabel: string
  topicsLabel: string
  lettersLabel: string
  stepsLabel: string
  resultLabel: string
  detailsLabel: string
  categoriesLabel: string
  comingSoonLabel: string
  comingSoonNote: string
  /** The 16 services, grouped into the same three categories as before. */
  functionsIntro: string
  /** The 12 guide topics, grouped into the same three categories as before. */
  guidesIntro: string
  /** The 4 letter templates, grouped into the same three categories as before. */
  lettersIntro: string
  /** The dashboard training path, which is explicitly not finished yet. */
  dashboardIntro: string
  dashboardLessons: ComingSoonLesson[]
  noticeTitle: string
  notice: string
  primaryCta: string
  secondaryCta: string
  /** Titles for the four paths, in reading order. */
  paths: LearningPath[]
}

export const learningCenterCopy: Record<Locale, LearningCenterCopy> = {
  bg: {
    back: "Към началото",
    eyebrow: "HORIZON Learning Center",
    title: "Функции, наръчници и писма",
    intro: "Услуги, процедури и готови писма — на едно място.",
    howToUse: [
      "Избери раздел.",
      "Виж нужните стъпки.",
      "Отвори услугата или писмото.",
    ],
    pathsTitle: "Раздели",
    openLabel: "Отвори",
    topicsLabel: "теми",
    lettersLabel: "писма",
    stepsLabel: "Стъпка",
    resultLabel: "Получаваш",
    detailsLabel: "Как работи",
    categoriesLabel: "Категории",
    comingSoonLabel: "Очаквайте скоро",
    comingSoonNote: "Уроците за таблото предстоят.",
    functionsIntro: "16 услуги. Отвори карта за стъпките и резултата.",
    guidesIntro: "12 теми за германските институции и процедури.",
    lettersIntro: "4 готови немски писма за попълване и преглед.",
    dashboardIntro: "Уроците за таблото още не са публикувани.",
    dashboardLessons: [
      { title: "Навигация", body: "Основни раздели и текущи задачи." },
      { title: "Личен профил", body: "Лични данни и настройки." },
      { title: "Домакинство и финанси", body: "Доходи, разходи и домакинство." },
      { title: "Договори и срокове", body: "Плащания и крайни срокове." },
      { title: "Документи и случаи", body: "Файлове и текущи случаи." },
      { title: "Известия", body: "Напомняния и следващи действия." },
    ],
    noticeTitle: "Важно",
    notice:
      "HORIZON подрежда, обяснява и подготвя. Не взема автоматични решения. Не заменя данъчна, правна или социална консултация. HORIZON не е застраховател и не обещава цена, спестяване или одобрение. Партньорските връзки са означени.",
    primaryCta: "Създай профил",
    secondaryCta: "Вход",
    paths: [
      {
        id: "functions",
        number: "01",
        anchor: "functions",
        title: "Функции на HORIZON",
        tagline: "Услуги",
        start: "Избери услуга.",
      },
      {
        id: "guides",
        number: "02",
        anchor: "guides",
        title: "Наръчник за Германия",
        tagline: "Германия",
        start: "Прочети за процедурата.",
      },
      {
        id: "letters",
        number: "03",
        anchor: "letters",
        title: "Готови писма",
        tagline: "Писма",
        start: "Подготви немско писмо.",
      },
      {
        id: "dashboard",
        number: "04",
        anchor: "dashboard",
        title: "Обучение за таблото",
        tagline: "Обучение",
        start: "Уроците предстоят.",
      },
    ],
  },
  de: {
    back: "Zur Startseite",
    eyebrow: "HORIZON Learning Center",
    title: "Funktionen, Ratgeber und Briefe",
    intro: "Dienste, Verfahren und fertige Briefe — an einem Ort.",
    howToUse: [
      "Bereich wählen.",
      "Schritte ansehen.",
      "Dienst oder Brief öffnen.",
    ],
    pathsTitle: "Bereiche",
    openLabel: "Öffnen",
    topicsLabel: "Themen",
    lettersLabel: "Briefe",
    stepsLabel: "Schritt",
    resultLabel: "Ergebnis",
    detailsLabel: "So funktioniert es",
    categoriesLabel: "Kategorien",
    comingSoonLabel: "Demnächst",
    comingSoonNote: "Die Dashboard-Lektionen folgen.",
    functionsIntro: "16 Dienste. Öffne eine Karte für Schritte und Ergebnis.",
    guidesIntro: "12 Themen zu deutschen Behörden und Verfahren.",
    lettersIntro: "4 deutsche Briefe zum Ausfüllen und Prüfen.",
    dashboardIntro: "Die Dashboard-Lektionen sind noch nicht veröffentlicht.",
    dashboardLessons: [
      { title: "Navigation", body: "Bereiche und laufende Aufgaben." },
      { title: "Persönliches Profil", body: "Persönliche Daten und Einstellungen." },
      { title: "Haushalt und Finanzen", body: "Haushalt, Einkommen und Ausgaben." },
      { title: "Verträge und Fristen", body: "Zahlungen und Fristen." },
      { title: "Dokumente und Vorgänge", body: "Dateien und laufende Vorgänge." },
      { title: "Benachrichtigungen", body: "Erinnerungen und nächste Schritte." },
    ],
    noticeTitle: "Wichtig",
    notice:
      "HORIZON ordnet, erklärt und bereitet vor. Es trifft keine automatischen Entscheidungen und ersetzt keine Steuer-, Rechts- oder Sozialberatung. HORIZON ist kein Versicherer und verspricht keinen Preis, keine Ersparnis und keine Genehmigung. Partnerlinks sind gekennzeichnet.",
    primaryCta: "Profil erstellen",
    secondaryCta: "Anmelden",
    paths: [
      {
        id: "functions",
        number: "01",
        anchor: "functions",
        title: "HORIZON Funktionen",
        tagline: "Dienste",
        start: "Dienst auswählen.",
      },
      {
        id: "guides",
        number: "02",
        anchor: "guides",
        title: "Deutschland-Ratgeber",
        tagline: "Deutschland",
        start: "Verfahren nachlesen.",
      },
      {
        id: "letters",
        number: "03",
        anchor: "letters",
        title: "Fertige Briefe",
        tagline: "Briefe",
        start: "Deutschen Brief vorbereiten.",
      },
      {
        id: "dashboard",
        number: "04",
        anchor: "dashboard",
        title: "Dashboard-Training",
        tagline: "Training",
        start: "Lektionen folgen.",
      },
    ],
  },
}

/** The canonical Learning Center route, without the locale prefix. */
export const LEARNING_CENTER_PATH = "/learning-center"

/** The anchor of each path, so the redirects and the page cannot disagree. */
export const LEARNING_PATH_ANCHORS: Record<LearningPathId, string> = {
  functions: "functions",
  guides: "guides",
  letters: "letters",
  dashboard: "dashboard",
}

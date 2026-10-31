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
  dashboardPending: string
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
    title: "Научи HORIZON по пътеки",
    intro:
      "Едно място за всичко: какво можеш да свършиш, как минават процедурите в Германия и кои писма са готови. Започни от първа пътека и върви по номерата.",
    howToUse: [
      "Избери пътеката, която ти трябва сега.",
      "Отвори темата и прочети кратките стъпки.",
      "Стигни до точната услуга, наръчника или писмото.",
    ],
    pathsTitle: "Четири пътеки",
    openLabel: "Отвори",
    topicsLabel: "теми",
    lettersLabel: "писма",
    stepsLabel: "Стъпка",
    resultLabel: "Получаваш",
    detailsLabel: "Как работи",
    categoriesLabel: "Категории",
    comingSoonLabel: "Очаквайте скоро",
    comingSoonNote:
      "Тази пътека е в подготовка. Ще я допълним, след като таблото е готово. Дотогава не обещаваме функции, които още ги няма.",
    functionsIntro:
      "Шестнайсет услуги, групирани по това какво ти е нужно в момента. Всяка показва проблема, трите стъпки и какво получаваш.",
    guidesIntro:
      "Дванайсет теми за немските институции и процедури. Всяка обяснява какво прави службата, какво да носиш и къде се сбърква най-често.",
    lettersIntro:
      "Четири готови немски писма. Попълваш няколко полета и виждаш готовия текст с твоите данни, преди да го изпратиш.",
    dashboardIntro:
      "Обучение за работата с таблото на HORIZON. Структурата е подготвена, но уроците идват, след като таблото е завършено.",
    dashboardLessons: [
      { title: "Навигация в таблото", body: "Как да стигнеш до най-важното и да се връщаш бързо към текущите си задачи." },
      { title: "Личен профил", body: "Къде живеят данните ти и как да ги поддържаш актуални и верни." },
      { title: "Домакинство и финанси", body: "Как да опишеш домакинството, доходите и разходите, за да са полезни проверките." },
      { title: "Договори и срокове", body: "Как да следиш какво плащаш и кога изтичат сроковете." },
      { title: "Документи и случаи", body: "Как документите и случаите се подреждат заедно на едно място." },
      { title: "Известия и препоръки", body: "Как да получаваш навременни напомняния и какво да проверяваш след това." },
    ],
    dashboardPending:
      "Уроците в тази пътека са обявени като предстоящи. Няма да намериш тук незавършени функции.",
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
        tagline: "Какво можеш да свършиш",
        start: "Започни тук, ако не знаеш коя услуга ти трябва.",
      },
      {
        id: "guides",
        number: "02",
        anchor: "guides",
        title: "Наръчник за Германия",
        tagline: "Институции, пари и ежедневие",
        start: "Продължи тук, за да разбереш процедурата, преди да действаш.",
      },
      {
        id: "letters",
        number: "03",
        anchor: "letters",
        title: "Готови писма",
        tagline: "Попълнени с твоите данни",
        start: "Продължи тук, когато трябва да изпратиш немско писмо.",
      },
      {
        id: "dashboard",
        number: "04",
        anchor: "dashboard",
        title: "Обучение за таблото",
        tagline: "Очаквайте скоро",
        start: "Ще се появи, след като таблото е готово.",
      },
    ],
  },
  de: {
    back: "Zur Startseite",
    eyebrow: "HORIZON Learning Center",
    title: "Lerne HORIZON in Lernpfaden",
    intro:
      "Ein Ort für alles: was du erledigen kannst, wie die Verfahren in Deutschland ablaufen und welche Briefe fertig sind. Starte beim ersten Pfad und folge den Nummern.",
    howToUse: [
      "Wähle den Pfad, den du jetzt brauchst.",
      "Öffne das Thema und lies die kurzen Schritte.",
      "Lande beim passenden Dienst, Ratgeber oder Brief.",
    ],
    pathsTitle: "Vier Lernpfade",
    openLabel: "Öffnen",
    topicsLabel: "Themen",
    lettersLabel: "Briefe",
    stepsLabel: "Schritt",
    resultLabel: "Ergebnis",
    detailsLabel: "So funktioniert es",
    categoriesLabel: "Kategorien",
    comingSoonLabel: "Demnächst",
    comingSoonNote:
      "Dieser Pfad ist in Vorbereitung. Wir ergänzen ihn, sobald das Dashboard fertig ist. Bis dahin versprechen wir keine Funktionen, die es noch nicht gibt.",
    functionsIntro:
      "Sechzehn Dienste, gruppiert danach, was du gerade brauchst. Jeder zeigt das Problem, die drei Schritte und dein Ergebnis.",
    guidesIntro:
      "Zwölf Themen zu deutschen Behörden und Verfahren. Jedes erklärt, was die Stelle tut, was mitzubringen ist und was am häufigsten schiefgeht.",
    lettersIntro:
      "Vier fertige deutsche Briefe. Wenige Felder ausfüllen und den fertigen Text mit deinen Daten sehen, bevor du ihn sendest.",
    dashboardIntro:
      "Lernen, wie das HORIZON-Dashboard funktioniert. Die Struktur steht, die Lektionen folgen, sobald das Dashboard fertig ist.",
    dashboardLessons: [
      { title: "Navigation im Dashboard", body: "Wie du zum Wichtigsten kommst und schnell zu deinen laufenden Vorgängen zurückfindest." },
      { title: "Persönliches Profil", body: "Wo deine Angaben liegen und wie du sie aktuell und richtig hältst." },
      { title: "Haushalt und Finanzen", body: "Wie du Haushalt, Einkommen und Ausgaben beschreibst, damit die Prüfungen nützlich sind." },
      { title: "Verträge und Fristen", body: "Wie du im Blick behältst, was du zahlst und wann Fristen enden." },
      { title: "Dokumente und Vorgänge", body: "Wie Dokumente und Vorgänge an einem Ort zusammen geordnet werden." },
      { title: "Hinweise und Empfehlungen", body: "Wie du rechtzeitige Erinnerungen bekommst und was du danach prüfst." },
    ],
    dashboardPending:
      "Die Lektionen dieses Pfads sind als kommend gekennzeichnet. Unfertige Funktionen findest du hier nicht.",
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
        tagline: "Was du erledigen kannst",
        start: "Starte hier, wenn du nicht weißt, welcher Dienst passt.",
      },
      {
        id: "guides",
        number: "02",
        anchor: "guides",
        title: "Deutschland-Ratgeber",
        tagline: "Behörden, Geld und Alltag",
        start: "Weiter hier, um das Verfahren zu verstehen, bevor du handelst.",
      },
      {
        id: "letters",
        number: "03",
        anchor: "letters",
        title: "Fertige Briefe",
        tagline: "Mit deinen Daten ausgefüllt",
        start: "Weiter hier, wenn du einen deutschen Brief senden musst.",
      },
      {
        id: "dashboard",
        number: "04",
        anchor: "dashboard",
        title: "Dashboard-Training",
        tagline: "Demnächst",
        start: "Erscheint, sobald das Dashboard fertig ist.",
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

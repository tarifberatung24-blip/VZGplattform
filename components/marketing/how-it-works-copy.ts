import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Copy for the public "how it works" page.
 *
 * The four stages mirror the four numbered points of the home hero, so the
 * page explains exactly what the hero promises. Stage 4 (financial goals) is
 * the Capital layer, which has no user-facing surface yet: it is shown with a
 * "coming soon" badge instead of as an available function.
 *
 * Humanizer standard: no em or en dashes, no exclamation marks, no invented
 * numbers, ratings or guarantees. A test locks these rules.
 */
export type HowItWorksStageId = "understand" | "manage" | "analyze" | "plan"

export type HowItWorksStage = {
  id: HowItWorksStageId
  label: string
  title: string
  body: string
  chips: string[]
  /** Set when the stage is not available to users yet. */
  soon?: string
}

export type HowItWorksCopy = {
  back: string
  eyebrow: string
  title: string
  intro: string
  pathLabel: string
  stepWord: string
  stages: [HowItWorksStage, HowItWorksStage, HowItWorksStage, HowItWorksStage]
  communicate: { title: string; body: string }
  notice: string
  primaryCta: string
  secondaryCta: string
}

export const howItWorksCopy: Record<Locale, HowItWorksCopy> = {
  bg: {
    back: "Към началото",
    eyebrow: "Как работи",
    title: "Как работи HORIZON",
    intro:
      "Четири стъпки, които те водят от немското писмо до ясно решение. На български, с твоя контрол на всяка стъпка.",
    pathLabel: "Четирите стъпки на HORIZON",
    stepWord: "Стъпка",
    stages: [
      {
        id: "understand",
        label: "Разбери",
        title: "Разбери немските правила и институции",
        body: "Качи писмо, договор или сметка. HORIZON ти обяснява на български какво пише, кой срок важи и какво се очаква от теб.",
        chips: ["Обяснение на български", "Срокове от самия документ"],
      },
      {
        id: "manage",
        label: "Управлявай",
        title: "Управлявай документите и договорите си",
        body: "Документи, договори и срокове стоят на едно място. Виждаш какво е отворено и кое е следващото действие, без да пропуснеш срок.",
        chips: ["Всичко на едно място", "Напомняния за срокове"],
      },
      {
        id: "analyze",
        label: "Анализирай",
        title: "Анализирай разходите си",
        body: "Прегледай постоянните си разходи и договори и виж къде губиш пари. Когато има по-изгодна оферта, ти я показваме открито, с ясно означен партньорски линк.",
        chips: ["Преглед на договорите", "Прозрачни партньорски оферти"],
      },
      {
        id: "plan",
        label: "Планирай",
        title: "Постигни финансовите си цели",
        body: "Провери, след индивидуален анализ на текущата ти ситуация, как да постигнеш финансовите си цели, с ясен план, който да следваш.",
        chips: ["Финансови цели", "Ясен план"],
        soon: "Скоро",
      },
    ],
    communicate: {
      title: "Комуникирай без езикова бариера",
      body: "HORIZON подготвя писма и отговори до институции и доставчици на немски. Ти преглеждаш всяка чернова и решаваш сам дали и кога да я изпратиш.",
    },
    notice: "HORIZON подрежда и обяснява. Не заменя данъчна, правна или социална консултация.",
    primaryCta: "Създай профил",
    secondaryCta: "Вход",
  },
  de: {
    back: "Zur Startseite",
    eyebrow: "So funktioniert's",
    title: "So funktioniert HORIZON",
    intro:
      "Vier Schritte vom deutschen Brief bis zur klaren Entscheidung. Auf Bulgarisch erklärt, und du behältst bei jedem Schritt die Kontrolle.",
    pathLabel: "Die vier Schritte von HORIZON",
    stepWord: "Schritt",
    stages: [
      {
        id: "understand",
        label: "Verstehen",
        title: "Deutsche Regeln und Behörden verstehen",
        body: "Lade einen Brief, Vertrag oder eine Rechnung hoch. HORIZON erklärt dir auf Bulgarisch, was drinsteht, welche Frist gilt und was von dir erwartet wird.",
        chips: ["Erklärung auf Bulgarisch", "Fristen aus dem Dokument selbst"],
      },
      {
        id: "manage",
        label: "Verwalten",
        title: "Dokumente und Verträge verwalten",
        body: "Dokumente, Verträge und Fristen liegen an einem Ort. Du siehst, was offen ist und was als Nächstes zu tun ist, ohne eine Frist zu verpassen.",
        chips: ["Alles an einem Ort", "Erinnerungen an Fristen"],
      },
      {
        id: "analyze",
        label: "Analysieren",
        title: "Ausgaben analysieren",
        body: "Prüfe deine laufenden Kosten und Verträge und sieh, wo du Geld verlierst. Gibt es ein günstigeres Angebot, zeigen wir es offen und mit klar gekennzeichnetem Partnerlink.",
        chips: ["Vertragsübersicht", "Transparente Partnerangebote"],
      },
      {
        id: "plan",
        label: "Planen",
        title: "Finanzielle Ziele erreichen",
        body: "Finde nach einer individuellen Analyse deiner aktuellen Situation heraus, wie du deine finanziellen Ziele erreichst, mit einem klaren Plan, dem du folgen kannst.",
        chips: ["Finanzielle Ziele", "Klarer Plan"],
        soon: "Demnächst",
      },
    ],
    communicate: {
      title: "Ohne Sprachbarriere kommunizieren",
      body: "HORIZON bereitet Briefe und Antworten an Behörden und Anbieter auf Deutsch vor. Du prüfst jeden Entwurf und entscheidest selbst, ob und wann er versendet wird.",
    },
    notice: "HORIZON ordnet und erklärt. Es ersetzt keine Steuer-, Rechts- oder Sozialberatung.",
    primaryCta: "Profil erstellen",
    secondaryCta: "Anmelden",
  },
}

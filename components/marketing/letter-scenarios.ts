import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Sample letters for the home hero animation.
 *
 * Every sender, person, address and figure here is fictional ("Musterstadt",
 * "Muster") and the visual is labelled as an example, so nothing reads as a
 * real customer document. The German letters stay German in both locales,
 * because that is what users actually receive; only the explanation cards are
 * localized.
 *
 * Order matters: the tax document comes first because a tax refund is the most
 * concrete money benefit (Destatis: average refund 1 240 euro, tax year 2022).
 * The claim on the card itself stays general ("most people get money back").
 *
 * Humanizer standard for the cards: no em or en dashes, no exclamation marks.
 */

export type SampleLetter = {
  sender: string
  senderLine: string
  recipient: string[]
  date: string
  reference: string
  subject: string
  paragraphs: string[]
  footer: string
}

export type LetterScenarioId = "tax" | "jobcenter" | "energy"

export type LetterExplanation = { what: string; deadline: string; action: string }

export const sampleLetters: Record<LetterScenarioId, SampleLetter> = {
  tax: {
    sender: "Muster Logistik GmbH",
    senderLine: "Personalabteilung · Hafenstraße 4 · 12345 Musterstadt",
    recipient: ["Frau Elena Muster", "Musterstraße 1", "12345 Musterstadt"],
    date: "15.02.2023",
    reference: "Personalnummer 004817",
    subject: "Ausdruck der elektronischen Lohnsteuerbescheinigung für 2022",
    paragraphs: [
      "Bescheinigungszeitraum 01.01. bis 31.12.2022. Steuerklasse 1, Kinderfreibeträge 0,0.",
      "3. Bruttoarbeitslohn einschl. Sachbezüge 38.420,00 EUR. 4. Einbehaltene Lohnsteuer 5.112,00 EUR. 6. Einbehaltener Solidaritätszuschlag 0,00 EUR.",
      "23. Arbeitnehmeranteil zur gesetzlichen Rentenversicherung 3.573,06 EUR. 25. Arbeitnehmerbeiträge zur gesetzlichen Krankenversicherung 3.131,23 EUR.",
      "Die Daten wurden elektronisch an die Finanzverwaltung übermittelt. Bitte bewahren Sie diesen Ausdruck für Ihre Einkommensteuererklärung auf.",
    ],
    footer: "Muster Logistik GmbH · Amtsgericht Musterstadt HRB 0000 · USt-IdNr. DE000000000",
  },
  jobcenter: {
    sender: "Jobcenter Musterstadt",
    senderLine: "Team 412 · Am Markt 7 · 12345 Musterstadt",
    recipient: ["Frau Elena Muster", "Musterstraße 1", "12345 Musterstadt"],
    date: "08.10.2026",
    reference: "BG-Nummer 12345//0000001",
    subject: "Aufforderung zur Mitwirkung (§ 60 SGB I)",
    paragraphs: [
      "Sehr geehrte Frau Muster, zur Prüfung Ihres Anspruchs auf Bürgergeld benötigen wir weitere Unterlagen.",
      "Bitte reichen Sie folgende Nachweise ein: Lohnabrechnungen der letzten drei Monate sowie Kontoauszüge der letzten drei Monate.",
      "Bitte legen Sie die Unterlagen bis zum 24.10.2026 vor. Kommen Sie Ihrer Mitwirkungspflicht nicht nach, können die Leistungen ganz oder teilweise versagt werden (§ 66 SGB I).",
      "Mit freundlichen Grüßen, Ihr Jobcenter Musterstadt",
    ],
    footer: "Jobcenter Musterstadt · Servicetelefon 0000 000000 · Öffnungszeiten Mo bis Fr 8 bis 12 Uhr",
  },
  energy: {
    sender: "Stadtwerke Musterstadt",
    senderLine: "Kundenservice Strom · Postfach 10 20 30 · 12345 Musterstadt",
    recipient: ["Frau Elena Muster", "Musterstraße 1", "12345 Musterstadt"],
    date: "20.10.2026",
    reference: "Vertragskonto 7700 1234 56",
    subject: "Preisanpassung Ihres Stromtarifs zum 01.12.2026",
    paragraphs: [
      "Sehr geehrte Frau Muster, aufgrund gestiegener Beschaffungskosten passen wir die Preise Ihres Tarifs MusterStrom Basis an.",
      "Der Arbeitspreis steigt von 32,40 Cent auf 36,90 Cent je Kilowattstunde. Der Grundpreis bleibt unverändert.",
      "Sie haben das Recht, den Vertrag ohne Einhaltung einer Kündigungsfrist zum Zeitpunkt der Preisänderung zu kündigen.",
      "Mit freundlichen Grüßen, Ihre Stadtwerke Musterstadt",
    ],
    footer: "Stadtwerke Musterstadt GmbH · Amtsgericht Musterstadt HRB 0000 · Geschäftsführung M. Muster",
  },
}

export type LetterHeroCopy = {
  regionLabel: string
  sample: string
  labels: { what: string; deadline: string; action: string }
  show: (index: number) => string
  explanations: Record<LetterScenarioId, LetterExplanation>
}

export const letterScenarioOrder: LetterScenarioId[] = ["tax", "jobcenter", "energy"]

export const letterHeroCopy: Record<Locale, LetterHeroCopy> = {
  bg: {
    regionLabel: "Пример: как Horizon обяснява немско писмо",
    sample: "Пример",
    labels: { what: "Какво пише", deadline: "Срок", action: "Какво да направиш" },
    show: (index) => `Покажи пример ${index}`,
    explanations: {
      tax: {
        what: "Удостоверение за заплатата и платения данък за 2022.",
        deadline: "Декларацията за 2022 може да се подаде до 31.12.2026.",
        action: "Подай декларация. Повечето хора получават пари обратно.",
      },
      jobcenter: {
        what: "Jobcenter иска документи за доходите ти.",
        deadline: "До 24 октомври.",
        action: "Изпрати последните 3 фиша за заплата.",
      },
      energy: {
        what: "Доставчикът вдига цената на тока от 1 декември.",
        deadline: "Можеш да прекратиш договора до 1 декември, без предизвестие.",
        action: "Сравни тарифите и реши дали да смениш.",
      },
    },
  },
  de: {
    regionLabel: "Beispiel: So erklärt Horizon einen deutschen Brief",
    sample: "Beispiel",
    labels: { what: "Was drinsteht", deadline: "Frist", action: "Was du tun kannst" },
    show: (index) => `Beispiel ${index} zeigen`,
    explanations: {
      tax: {
        what: "Nachweis über deinen Lohn und die gezahlte Steuer für 2022.",
        deadline: "Die Erklärung für 2022 kannst du bis 31.12.2026 abgeben.",
        action: "Gib die Erklärung ab. Die meisten bekommen Geld zurück.",
      },
      jobcenter: {
        what: "Das Jobcenter braucht Nachweise über dein Einkommen.",
        deadline: "Bis 24. Oktober.",
        action: "Schick die letzten 3 Lohnabrechnungen.",
      },
      energy: {
        what: "Dein Stromanbieter erhöht den Preis ab 1. Dezember.",
        deadline: "Du kannst bis zur Preisänderung ohne Frist kündigen.",
        action: "Vergleiche Tarife und entscheide, ob du wechselst.",
      },
    },
  },
}

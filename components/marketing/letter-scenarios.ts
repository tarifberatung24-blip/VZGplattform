import type { Locale } from "@/lib/i18n/dictionaries"

/**
 * Cases for the home hero envelope.
 *
 * Each case has two sides: the German letter as people actually receive it
 * ("before") and the same case as it shows up in the personal HORIZON
 * dashboard ("after"). The letters stay German in both locales; only the
 * dashboard side is localized.
 *
 * Every sender, person, address, file number and amount is fictional
 * ("Muster", "Musterstadt") and both sides carry an "example" label, so nothing
 * reads as a real customer document. Amounts are internally consistent: the
 * figures on the dashboard side are computed from the figures in the letter.
 *
 * Humanizer standard for the dashboard copy: no em or en dashes, no
 * exclamation marks, no guarantees. Partner offers are named as partner offers.
 */

export type LetterRows = { rows: Array<[string, string]>; total?: [string, string] }
export type LetterBlock = string | LetterRows

export type SampleLetter = {
  sender: string
  senderLine: string
  recipient: string[]
  date: string
  reference: string
  subject: string
  body: LetterBlock[]
  footer: string
}

export type LetterCaseId = "inkasso" | "energy" | "jobcenter" | "tax"

export type Tone = "urgent" | "warn" | "good" | "neutral"

export type DashboardFigure = {
  label: string
  value: string
  tone?: Tone
  /** When set, the value counts up from zero the first time the side is shown. */
  countTo?: number
}

export type DashboardCase = {
  /** Status chip, for example "Urgent". */
  tag: string
  tone: Tone
  /** Sender and the day the letter arrived in HORIZON. */
  meta: string
  title: string
  summary: string
  /** A HORIZON notification shown above the case, when the case raised one. */
  notice?: string
  figures: [DashboardFigure, DashboardFigure, DashboardFigure]
  steps: [string, string, string]
  action: string
  /** Small print under the action, for example a partner disclosure. */
  note?: string
}

export const letterCaseOrder: LetterCaseId[] = ["inkasso", "energy", "jobcenter", "tax"]

const RECIPIENT = ["Frau Elena Muster", "Musterstraße 1", "12345 Musterstadt"]

export const sampleLetters: Record<LetterCaseId, SampleLetter> = {
  inkasso: {
    sender: "Muster Inkasso GmbH",
    senderLine: "Forderungsmanagement · Postfach 4 40 · 12345 Musterstadt",
    recipient: RECIPIENT,
    date: "07.10.2026",
    reference: "Aktenzeichen 2026/48113-EM",
    subject: "Zahlungsaufforderung · Letzte außergerichtliche Mahnung",
    body: [
      "Sehr geehrte Frau Muster, unsere Mandantin, die FitMuster Studio GmbH, hat uns mit dem Einzug folgender Forderung beauftragt:",
      {
        rows: [
          ["Hauptforderung Mitgliedsbeitrag 08/2026", "59,90 EUR"],
          ["Mahngebühren der Mandantin", "5,00 EUR"],
          ["Verzugszinsen", "1,27 EUR"],
          ["Inkassovergütung", "58,50 EUR"],
          ["Auslagenpauschale", "7,50 EUR"],
        ],
        total: ["Gesamtforderung", "132,17 EUR"],
      },
      "Bitte überweisen Sie den Gesamtbetrag bis zum 19.10.2026. Andernfalls behalten wir uns die Einleitung des gerichtlichen Mahnverfahrens vor.",
    ],
    footer: "Muster Inkasso GmbH · Amtsgericht Musterstadt HRB 0000 · registriert nach § 10 RDG",
  },
  energy: {
    sender: "Stadtwerke Musterstadt",
    senderLine: "Kundenservice Strom · Postfach 10 20 30 · 12345 Musterstadt",
    recipient: RECIPIENT,
    date: "28.09.2026",
    reference: "Vertragskonto 7700 1234 56",
    subject: "Änderung Ihrer Strompreise zum 01.12.2026",
    body: [
      "Sehr geehrte Frau Muster, aufgrund gestiegener Beschaffungskosten und höherer Netzentgelte passen wir die Preise Ihres Tarifs MusterStrom Basis an.",
      {
        rows: [
          ["Arbeitspreis bisher", "32,40 ct/kWh"],
          ["Arbeitspreis ab 01.12.2026", "39,80 ct/kWh"],
          ["Grundpreis unverändert", "13,90 EUR/Monat"],
        ],
        total: ["Neuer monatlicher Abschlag", "107,00 EUR"],
      },
      "Sie haben das Recht, den Vertrag ohne Einhaltung einer Kündigungsfrist zum Wirksamwerden der Preisänderung zu kündigen (§ 41 Abs. 5 EnWG).",
    ],
    footer: "Stadtwerke Musterstadt GmbH · Amtsgericht Musterstadt HRB 0000 · Geschäftsführung M. Muster",
  },
  jobcenter: {
    sender: "Jobcenter Musterstadt",
    senderLine: "Team 412 · Am Markt 7 · 12345 Musterstadt",
    recipient: RECIPIENT,
    date: "30.09.2026",
    reference: "BG-Nummer 12345//0000001",
    subject: "Aufhebungs- und Erstattungsbescheid",
    body: [
      "Sehr geehrte Frau Muster, die Bewilligung von Bürgergeld für die Zeit vom 01.06.2026 bis 31.08.2026 wird teilweise aufgehoben (§ 48 SGB X i. V. m. § 40 SGB II). Grund: Einkommen aus Ihrer Beschäftigung ab 01.06.2026.",
      {
        rows: [
          ["Überzahlung Juni 2026", "428,20 EUR"],
          ["Überzahlung Juli 2026", "428,20 EUR"],
          ["Überzahlung August 2026", "428,20 EUR"],
        ],
        total: ["Zu erstattender Betrag", "1.284,60 EUR"],
      },
      "Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden.",
    ],
    footer: "Jobcenter Musterstadt · Servicetelefon 0000 000000 · Mo bis Fr 8 bis 12 Uhr",
  },
  tax: {
    sender: "Muster Logistik GmbH",
    senderLine: "Personalabteilung · Hafenstraße 4 · 12345 Musterstadt",
    recipient: RECIPIENT,
    date: "15.02.2023",
    reference: "Personalnummer 004817",
    subject: "Ausdruck der elektronischen Lohnsteuerbescheinigung für 2022",
    body: [
      "Bescheinigungszeitraum 01.01. bis 31.12.2022. Steuerklasse 1, Kinderfreibeträge 0,0.",
      {
        rows: [
          ["3. Bruttoarbeitslohn", "38.420,00 EUR"],
          ["4. Einbehaltene Lohnsteuer", "5.112,00 EUR"],
          ["23. Rentenversicherung AN-Anteil", "3.573,06 EUR"],
          ["25. Krankenversicherung AN-Beitrag", "3.131,23 EUR"],
        ],
      },
      "Die Daten wurden elektronisch an die Finanzverwaltung übermittelt. Bitte bewahren Sie diesen Ausdruck für Ihre Einkommensteuererklärung auf.",
    ],
    footer: "Muster Logistik GmbH · Amtsgericht Musterstadt HRB 0000 · USt-IdNr. DE000000000",
  },
}

export type EnvelopeCopy = {
  regionLabel: string
  sample: string
  /** Shown above the closed envelope. */
  eyebrow: string
  open: string
  before: string
  after: string
  toAfter: string
  upload: string
  next: string
  hint: string
  dashboard: string
  notice: string
  stepsTitle: string
  casesLabel: string
  caseNames: Record<LetterCaseId, string>
  showCase: (name: string) => string
  cases: Record<LetterCaseId, DashboardCase>
}

export const envelopeCopy: Record<Locale, EnvelopeCopy> = {
  bg: {
    regionLabel: "Пример: как Horizon превръща немско писмо в ясен план",
    sample: "Пример",
    eyebrow: "Кликни върху писмото - разбери как ти помага Horizon",
    open: "Отвори писмото",
    before: "Ти получаваш в този вид писмено известие",
    after: "Ето какво ще покаже клиентското ти табло HORIZON",
    toAfter: "Виж как HORIZON го подрежда",
    upload: "Качи писмото в HORIZON",
    next: "Виж друг пример",
    hint: "Кликни или скролни върху писмото",
    dashboard: "Моето табло",
    notice: "Известие",
    stepsTitle: "Какво да направиш",
    casesLabel: "Избери казус",
    caseNames: { inkasso: "Инкасо", energy: "Ток", jobcenter: "Jobcenter", tax: "Данъци" },
    showCase: (name) => `Покажи казус: ${name}`,
    cases: {
      inkasso: {
        tag: "Спешно",
        tone: "urgent",
        meta: "Muster Inkasso GmbH · получено 08.10.2026",
        title: "Инкасо иска 132,17 € за членски внос във фитнес",
        summary: "Самият дълг е 59,90 € за август. Другите 72,27 € са такси и лихви, повече от самия дълг.",
        figures: [
          { label: "Дълг", value: "59,90 €" },
          { label: "Такси и лихви", value: "72,27 €", tone: "warn" },
          { label: "Срок", value: "19.10.2026", tone: "urgent" },
        ],
        steps: [
          "Провери в банковото извлечение дали август е платен.",
          "Ако е платен, HORIZON подготвя писмо за оспорване на немски.",
          "Ако дългът е реален, поискай разбивка на таксите, преди да платиш.",
        ],
        action: "Подготви писмо за оспорване",
        note: "Чернова. Ти решаваш дали и кога да я изпратиш.",
      },
      energy: {
        tag: "Спестяване",
        tone: "good",
        meta: "Stadtwerke Musterstadt · получено 30.09.2026",
        notice: "Цената на тока ти се вдига с 23 % от 01.12.2026. Можеш да прекратиш договора без предизвестие.",
        title: "Токът поскъпва. Има по-изгоден тариф.",
        summary: "При 2 800 kWh годишно новата цена е 1 281,20 €. Същото количество ток в другия тариф струва 987,20 €.",
        figures: [
          { label: "Нова цена", value: "1 281,20 €/г." },
          { label: "Друг тариф", value: "987,20 €/г." },
          { label: "Спестяваш", value: "294,00 €/г.", tone: "good", countTo: 294 },
        ],
        steps: [
          "Сравни тарифите. Офертата е от партньор и е означена ясно.",
          "HORIZON подготвя прекратяването до 30.11.2026.",
          "Смяната минава без прекъсване на тока.",
        ],
        action: "Виж офертата",
        note: "Партньорска оферта. Сметката е при същия годишен разход.",
      },
      jobcenter: {
        tag: "Сложен казус",
        tone: "warn",
        meta: "Jobcenter Musterstadt · получено 02.10.2026",
        title: "Jobcenter иска да върнеш 1 284,60 € за юни до август",
        summary:
          "Причината е заплатата от новата ти работа. В разчета не виждаме приспадната свободна сума от заплатата (Freibetrag). Това може да намали сумата.",
        figures: [
          { label: "Иска", value: "1 284,60 €" },
          { label: "Срок за Widerspruch", value: "02.11.2026", tone: "urgent" },
          { label: "Стъпки", value: "3" },
        ],
        steps: [
          "HORIZON подготвя Widerspruch на немски, за да не изтече срокът.",
          "Поискай разчета (Berechnungsbogen) и провери Freibetrag.",
          "Ако сумата остане, поискай да я платиш на вноски.",
        ],
        action: "Подготви Widerspruch",
        note: "Чернова. Не заменя социална или правна консултация.",
      },
      tax: {
        tag: "Възможност",
        tone: "good",
        meta: "Muster Logistik GmbH · качено 10.10.2026",
        title: "Декларацията за 2022 още може да се подаде",
        summary:
          "Това е удостоверението за заплатата и платения данък. Декларацията за 2022 е доброволна и може да се подаде до 31.12.2026. Повечето хора получават пари обратно.",
        figures: [
          { label: "Година", value: "2022" },
          { label: "Платен данък", value: "5 112,00 €" },
          { label: "Срок", value: "31.12.2026", tone: "warn" },
        ],
        steps: [
          "Събери разходите за път до работа и работни материали.",
          "HORIZON подрежда документите за декларацията.",
          "Подаваш през ELSTER или с данъчен консултант.",
        ],
        action: "Подреди документите",
        note: "HORIZON подрежда и обяснява. Не заменя данъчна консултация.",
      },
    },
  },
  de: {
    regionLabel: "Beispiel: So macht Horizon aus einem deutschen Brief einen klaren Plan",
    sample: "Beispiel",
    eyebrow: "Klicke auf den Brief - sieh, wie Horizon dir hilft",
    open: "Brief öffnen",
    before: "So erhältst du eine schriftliche Mitteilung",
    after: "Das zeigt dir dein HORIZON Dashboard",
    toAfter: "Sieh, wie HORIZON es ordnet",
    upload: "Brief in HORIZON hochladen",
    next: "Weiteres Beispiel ansehen",
    hint: "Klick oder scrolle auf den Brief",
    dashboard: "Mein Dashboard",
    notice: "Hinweis",
    stepsTitle: "Was du tun kannst",
    casesLabel: "Fall wählen",
    caseNames: { inkasso: "Inkasso", energy: "Strom", jobcenter: "Jobcenter", tax: "Steuer" },
    showCase: (name) => `Fall zeigen: ${name}`,
    cases: {
      inkasso: {
        tag: "Dringend",
        tone: "urgent",
        meta: "Muster Inkasso GmbH · eingegangen 08.10.2026",
        title: "Inkasso fordert 132,17 € für einen Fitnessbeitrag",
        summary: "Die eigentliche Schuld sind 59,90 € für August. Die übrigen 72,27 € sind Gebühren und Zinsen, mehr als die Schuld selbst.",
        figures: [
          { label: "Forderung", value: "59,90 €" },
          { label: "Gebühren und Zinsen", value: "72,27 €", tone: "warn" },
          { label: "Frist", value: "19.10.2026", tone: "urgent" },
        ],
        steps: [
          "Prüfe im Kontoauszug, ob der August bezahlt ist.",
          "Wenn ja, bereitet HORIZON einen Widerspruch auf Deutsch vor.",
          "Stimmt die Forderung, verlange vor der Zahlung eine Aufstellung der Gebühren.",
        ],
        action: "Widerspruch vorbereiten",
        note: "Entwurf. Du entscheidest, ob und wann er rausgeht.",
      },
      energy: {
        tag: "Ersparnis",
        tone: "good",
        meta: "Stadtwerke Musterstadt · eingegangen 30.09.2026",
        notice: "Dein Strompreis steigt ab 01.12.2026 um 23 %. Du kannst ohne Frist kündigen.",
        title: "Strom wird teurer. Es gibt einen günstigeren Tarif.",
        summary: "Bei 2.800 kWh im Jahr kostet der neue Preis 1.281,20 €. Dieselbe Menge kostet im anderen Tarif 987,20 €.",
        figures: [
          { label: "Neuer Preis", value: "1.281,20 €/J." },
          { label: "Anderer Tarif", value: "987,20 €/J." },
          { label: "Du sparst", value: "294,00 €/J.", tone: "good", countTo: 294 },
        ],
        steps: [
          "Vergleiche die Tarife. Das Angebot ist ein klar gekennzeichnetes Partnerangebot.",
          "HORIZON bereitet die Kündigung zum 30.11.2026 vor.",
          "Der Wechsel läuft ohne Unterbrechung der Stromversorgung.",
        ],
        action: "Angebot ansehen",
        note: "Partnerangebot. Gerechnet mit demselben Jahresverbrauch.",
      },
      jobcenter: {
        tag: "Komplexer Fall",
        tone: "warn",
        meta: "Jobcenter Musterstadt · eingegangen 02.10.2026",
        title: "Das Jobcenter fordert 1.284,60 € für Juni bis August zurück",
        summary:
          "Grund ist der Lohn aus deinem neuen Job. In der Berechnung sehen wir keinen abgezogenen Freibetrag vom Erwerbseinkommen. Das kann den Betrag senken.",
        figures: [
          { label: "Forderung", value: "1.284,60 €" },
          { label: "Widerspruchsfrist", value: "02.11.2026", tone: "urgent" },
          { label: "Schritte", value: "3" },
        ],
        steps: [
          "HORIZON bereitet den Widerspruch auf Deutsch vor, damit die Frist gewahrt bleibt.",
          "Fordere den Berechnungsbogen an und prüfe den Freibetrag.",
          "Bleibt ein Betrag offen, beantrage Ratenzahlung.",
        ],
        action: "Widerspruch vorbereiten",
        note: "Entwurf. Ersetzt keine Sozial- oder Rechtsberatung.",
      },
      tax: {
        tag: "Chance",
        tone: "good",
        meta: "Muster Logistik GmbH · hochgeladen 10.10.2026",
        title: "Die Erklärung für 2022 kannst du noch abgeben",
        summary:
          "Das ist der Nachweis über deinen Lohn und die gezahlte Steuer. Die Erklärung für 2022 ist freiwillig und geht bis 31.12.2026. Die meisten bekommen Geld zurück.",
        figures: [
          { label: "Jahr", value: "2022" },
          { label: "Gezahlte Steuer", value: "5.112,00 €" },
          { label: "Frist", value: "31.12.2026", tone: "warn" },
        ],
        steps: [
          "Sammle Belege für Arbeitsweg und Arbeitsmittel.",
          "HORIZON ordnet die Unterlagen für die Erklärung.",
          "Du gibst sie über ELSTER oder mit Steuerberatung ab.",
        ],
        action: "Unterlagen ordnen",
        note: "HORIZON ordnet und erklärt. Ersetzt keine Steuerberatung.",
      },
    },
  },
}

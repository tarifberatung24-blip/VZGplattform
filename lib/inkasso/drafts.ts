import type { Action } from "./rule-pack"
import type { CaseGroups } from "./facts"

/**
 * The four letters the check can produce. They are drafts, never filings:
 * nothing here is sent anywhere automatically, and the submission section
 * tells the user how to file it themselves.
 */

export interface DraftTemplate {
  action: Action
  title: Record<"bg" | "de", string>
  cost: number
}

export const DRAFT_TEMPLATES: DraftTemplate[] = [
  {
    action: "WIDERSPRUCH",
    title: { bg: "Възражение (Widerspruch)", de: "Widerspruch" },
    cost: 0,
  },
  {
    action: "ABTRETUNGSNACHWEIS",
    title: { bg: "Искане за удостоверение за прехвърляне", de: "Abtretungsnachweis anfordern" },
    cost: 0,
  },
  {
    action: "VERGLEICH",
    title: { bg: "Предложение за споразумение", de: "Vergleichsangebot" },
    cost: 0,
  },
  {
    action: "SCHUFA_UNTERLASSUNG",
    title: { bg: "Преустановяване на вписване в Schufa", de: "Schufa-Unterlassung" },
    cost: 0,
  },
]

/** The letters go to a German court, so amounts use German grouping. */
const money = (n: number) =>
  `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`

/**
 * Every letter quotes the amounts and legal bases from the evaluation, so the
 * user can see exactly where a figure came from before they send anything.
 */
export function renderDraft(
  action: Action,
  locale: "bg" | "de",
  groups: CaseGroups,
  reference: { caseNo: string; court: string; creditor: string; reducible: number; deadline: string | null },
): string {
  const { claim, evidence } = groups
  const bg = locale === "bg"

  const header = bg
    ? [
        "ЧЕРНОВА — не е изпратена. Провери всички полета преди подаване.",
        "",
        `До: ${reference.court || "[съд]"}`,
        `Дело №: ${reference.caseNo || "[номер]"}`,
        `Кредитор: ${reference.creditor || "[кредитор]"}`,
        "",
      ]
    : [
        "ENTWURF — nicht versandt. Alle Angaben vor dem Versand prüfen.",
        "",
        `An: ${reference.court || "[Gericht]"}`,
        `Aktenzeichen: ${reference.caseNo || "[Nummer]"}`,
        `Gläubiger: ${reference.creditor || "[Gläubiger]"}`,
        "",
      ]

  const facts = bg
    ? [
        "Позовавам се на следните суми:",
        `- Главница: ${money(claim.hauptforderung)}`,
        `- Разноски: ${money(claim.verfahrenskosten)}`,
        `- Инкасо такса: ${money(claim.inkassokosten)}`,
        `- Лихви: ${money(claim.zinsen)}`,
        `- Общо: ${money(claim.total)}`,
        "",
      ]
    : [
        "Ich beziehe mich auf folgende Beträge:",
        `- Hauptforderung: ${money(claim.hauptforderung)}`,
        `- Verfahrenskosten: ${money(claim.verfahrenskosten)}`,
        `- Inkassokosten: ${money(claim.inkassokosten)}`,
        `- Zinsen: ${money(claim.zinsen)}`,
        `- Gesamt: ${money(claim.total)}`,
        "",
      ]

  const lines: string[] = [...header, ...facts]

  if (action === "WIDERSPRUCH") {
    lines.push(
      bg
        ? [
            "В Ъ З Р А Ж Е Н И Е",
            "",
            "Оспорвам заявеното вземане по § 694 ZPO.",
            reference.reducible > 0
              ? `Оспоримата част възлиза на около ${money(reference.reducible)}.`
              : "",
            evidence.parallel_billing
              ? "За същия адрес и период имам друг реален доставчик; възраженията срещу предишния кредитор противопоставям на новия (§ 404 BGB)."
              : "",
            evidence.data_exchange_delay_admitted
              ? "Признат е срив в обмена на данни (§ 20a EnWG), поради което тежестта на доказване е върху доставчика."
              : "",
            "",
            "Моля да не се издава Vollstreckungsbescheid преди разглеждане на възражението.",
          ].filter(Boolean).join("\n")
        : [
            "W I D E R S P R U C H",
            "",
            "Ich widerspreche der geltend gemachten Forderung gemäß § 694 ZPO.",
            reference.reducible > 0
              ? `Der bestreitbare Anteil beträgt etwa ${money(reference.reducible)}.`
              : "",
            evidence.parallel_billing
              ? "Für dieselbe Adresse und denselben Zeitraum bestand ein anderer tatsächlicher Lieferant; die Einwendungen gegen den Altgläubiger setze ich dem Neugläubiger entgegen (§ 404 BGB)."
              : "",
            evidence.data_exchange_delay_admitted
              ? "Ein Datenübertragungsstörung ist eingeräumt (§ 20a EnWG); die Beweislast liegt damit beim Lieferanten."
              : "",
            "",
            "Ich bitte, vor einer Entscheidung keinen Vollstreckungsbescheid zu erlassen.",
          ].filter(Boolean).join("\n"),
    )
  }

  if (action === "ABTRETUNGSNACHWEIS") {
    lines.push(
      bg
        ? [
            "ИСКАНЕ ЗА УДОСТОВЕРЕНИЕ ЗА ПРЕХВЪРЛЯНЕ",
            "",
            "Искам доказателство за прехвърлянето на вземането (§ 410 BGB, § 13a RDG).",
            "До представяне на Abtretungsurkunde се позовавам на правото си да откажа плащане (§ 410 BGB).",
            "Моля да посочите как и кога вземането е преминало от първоначалния доставчик към Вас.",
          ].join("\n")
        : [
            "A N F O R D E R U N G   D E S   A B T R E T U N G S N A C H W E I S E S",
            "",
            "Ich fordere den Nachweis der Abtretung (§ 410 BGB, § 13a RDG).",
            "Bis zur Vorlage der Abtretungsurkunde berufe ich mich auf mein Leistungsverweigerungsrecht (§ 410 BGB).",
            "Bitte legen Sie dar, wie und wann die Forderung vom ursprünglichen Lieferanten auf Sie übergegangen ist.",
          ].join("\n"),
    )
  }

  if (action === "VERGLEICH") {
    lines.push(
      bg
        ? [
            "ПРЕДЛОЖЕНИЕ ЗА СПОРАЗУМЕНИЕ",
            "",
            `Готов съм да заплатя реалното потребление (${money(evidence.amount)}) при следните условия:`,
            "- опрощаване на лихвите и инкасо таксите;",
            "- без вписване в Schufa;",
            "- приключване на претенциите след плащането.",
            "",
            "Това е предложение за уреждане, а не признание на вземането.",
          ].join("\n")
        : [
            "V E R G L E I C H S A N G E B O T",
            "",
            `Ich bin bereit, den tatsächlichen Verbrauch (${money(evidence.amount)}) zu zahlen, wenn:`,
            "- Zinsen und Inkassokosten erlassen werden;",
            "- kein Schufa-Eintrag erfolgt;",
            "- die Ansprüche mit der Zahlung erledigt sind.",
            "",
            "Dies ist ein Vergleichsangebot und kein Anerkenntnis der Forderung.",
          ].join("\n"),
    )
  }

  if (action === "SCHUFA_UNTERLASSUNG") {
    lines.push(
      bg
        ? [
            "ИСКАНЕ ЗА ПРЕУСТАНОВЯВАНЕ НА ВПИСВАНЕ",
            "",
            "Оспореното и нетитолирано вземане не е годна кредитна информация (§ 31 Abs. 2 BDSG; OLG Schleswig 17 U 2/24).",
            "Искам да преустановите всякакво вписване или предаване на тези данни към Schufa и други агенции.",
          ].join("\n")
        : [
            "A N T R A G   A U F   U N T E R L A S S U N G",
            "",
            "Eine bestrittene und nicht titulierte Forderung ist keine belastbare Bonitätsinformation (§ 31 Abs. 2 BDSG; OLG Schleswig 17 U 2/24).",
            "Ich fordere Sie auf, jede Meldung dieser Daten an die Schufa und andere Auskunfteien zu unterlassen.",
          ].join("\n"),
    )
  }

  lines.push(
    "",
    bg
      ? "С уважение,\n[име и адрес]"
      : "Mit freundlichen Grüßen\n[Name und Anschrift]",
  )

  return lines.join("\n")
}

/**
 * How to file. The product never files anything, so this is the honest part of
 * the flow and it matters that it is concrete.
 */
export function submissionGuidance(locale: "bg" | "de", deadline: string | null) {
  return locale === "bg"
    ? [
        "Възражението може да се подаде на хартиения amtlicher Vordruck (допустимо за потребители).",
        "Или чрез портала www.online-mahnantrag.de (Barcode-Antrag / EDA).",
        "Срок: 2 седмици от връчването" + (deadline ? ` (твоят срок: ${deadline}).` : "."),
        "При изтекъл срок: Einspruch (§ 694 Abs. 2 ZPO) и евентуално Wiedereinsetzung (§ 233 ZPO).",
        "HORIZON не подава документа вместо теб.",
      ]
    : [
        "Der Widerspruch kann auf dem amtlichen Vordruck eingelegt werden (für Verbraucher zulässig).",
        "Oder über das Portal www.online-mahnantrag.de (Barcode-Antrag / EDA).",
        "Frist: zwei Wochen ab Zustellung" + (deadline ? ` (deine Frist: ${deadline}).` : "."),
        "Nach Fristablauf: Einspruch (§ 694 Abs. 2 ZPO) und ggf. Wiedereinsetzung (§ 233 ZPO).",
        "HORIZON versendet das Schreiben nicht für dich.",
      ]
}

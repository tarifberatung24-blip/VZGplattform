/**
 * Arbeitszeugnis anfordern — asking the employer for a written reference.
 *
 * An employee who leaves is entitled to a written reference (§ 630 BGB), and the
 * entitlement survives the end of the employment: a reference requested years
 * later is still owed. The reason this letter matters is that the right is
 * routinely not exercised — people assume the employer will send one, or feel
 * awkward asking — and then discover years later, applying for a job, that they
 * cannot produce one.
 *
 * The letter asks for the reference and, because the law allows it, for the
 * *kind* of reference: a simple one or a qualified one (`qualifiziertes
 * Zeugnis`, which also states performance and conduct). It does not draft the
 * reference's content, and it does not claim a deadline the law does not set.
 */

import { germanBusinessLetter, placeDateLine } from "@/lib/horizon/letters/scaffold"
import { formatGermanDate } from "@/lib/horizon/letters/format"
import { COMMON_FIELD_KEYS, commonFields } from "../common-fields"
import type { VorlageTemplate } from "../types"

const KEYS = {
  ...COMMON_FIELD_KEYS,
  employer: "employer_name",
  position: "position",
  employmentFrom: "employment_from",
  employmentTo: "employment_to",
  referenceKind: "reference_kind",
} as const

const SIMPLE = "einfach"

export const arbeitszeugnis: VorlageTemplate = {
  slug: "arbeitszeugnis-anfordern",
  category: "work",
  germanName: "Arbeitszeugnis anfordern",
  fields: [
    ...commonFields,
    {
      key: KEYS.employer,
      kind: "text",
      required: true,
      label: { bg: "Работодател", de: "Arbeitgeber" },
      hint: { bg: "Името на фирмата, както е в договора.", de: "Der Firmenname wie im Vertrag." },
    },
    {
      key: KEYS.position,
      kind: "text",
      required: false,
      label: { bg: "Длъжност", de: "Position" },
      hint: { bg: "Длъжността, за която искаш свидетелството.", de: "Die Position, für die das Zeugnis gilt." },
    },
    {
      key: KEYS.employmentFrom,
      kind: "date",
      required: true,
      label: { bg: "Работя от", de: "Beschäftigt seit" },
    },
    {
      key: KEYS.employmentTo,
      kind: "date",
      required: true,
      label: { bg: "Работя до", de: "Beschäftigt bis" },
    },
    {
      key: KEYS.referenceKind,
      kind: "text",
      required: false,
      label: { bg: "Какво свидетелство", de: "Welches Zeugnis" },
      hint: {
        bg: "Напиши „qualifiziert“ за пълно свидетелство (с оценка на работата и поведението) или „einfach“ за кратко. По подразбиране е пълното.",
        de: "„qualifiziert“ für ein vollständiges Zeugnis (Leistung und Verhalten) oder „einfach“ für ein kurzes. Standard ist das qualifizierte.",
      },
    },
  ],
  content: {
    bg: {
      title: "Arbeitszeugnis — искане за свидетелство от работодателя",
      summary:
        "Писмено искане до работодателя за Arbeitszeugnis — служебно свидетелство за работата ти, на което имаш право по закон.",
      intro:
        "След прекратяване на трудовото правоотношение имаш право на писмено свидетелство от работодателя. То се иска с писмо, а не се получава автоматично. Ако го поискаш по-късно, правото не изчезва — но колкото повече време минава, толкова по-трудно се доказва какво е било. Затова е добре да го поискаш веднага.",
      useWhen: [
        "Напускаш работа и искаш свидетелството да е готово преди последния ден.",
        "Работодателят не е изпратил свидетелство след прекратяване на договора.",
        "Работил си преди години и сега ти трябва свидетелство за нова кандидатура.",
      ],
      caveats: [
        "Писмото не съдържа самото свидетелство — то само го искаш. Съдържанието се пише от работодателя.",
        "Законът не определя срок, в който работодателят трябва да го издаде. Разумният срок обикновено се приема за няколко седмици.",
        "Провери свидетелството, когато го получиш: имаш право на корекция, ако е невярно или ако съдържа скрито негативно послание.",
        "За спор относно съдържанието се консултирай с адвокат по трудово право или с Betriebsrat.",
      ],
      faq: [
        {
          question: "Имам ли право на свидетелство по закон?",
          answer:
            "Да. § 630 BGB дава право на писмено свидетелство при прекратяване на трудовото правоотношение. То трябва да съдържа вида и продължителността на работата; при поискване — и оценка на работата и поведението.",
        },
        {
          question: "Каква е разликата между einfach и qualifiziert?",
          answer:
            "Einfaches Zeugnis описва само вида и продължителността на работата. Qualifiziertes Zeugnis включва и оценка на изпълнението и поведението. За нова кандидатура пълното свидетелство е по-полезно.",
        },
        {
          question: "Какво значи „скрит код“ в свидетелството?",
          answer:
            "Немските свидетелства имат утвърдени формулировки и малки отклонения могат да значат негативна оценка. Ако нещо звучи странно, поискай корекция или се консултирай.",
        },
      ],
    },
    de: {
      title: "Arbeitszeugnis anfordern – Zeugnis vom Arbeitgeber verlangen",
      summary:
        "Schriftliche Aufforderung an den Arbeitgeber, ein Arbeitszeugnis auszustellen – ein Anspruch, der gesetzlich besteht.",
      intro:
        "Nach dem Ende eines Arbeitsverhältnisses steht dir ein schriftliches Zeugnis zu. Es kommt nicht automatisch, sondern muss verlangt werden. Der Anspruch erlischt nicht, wenn du später fragst – aber je mehr Zeit vergeht, desto schwerer lässt sich der Inhalt belegen. Deshalb ist es sinnvoll, sofort zu fragen.",
      useWhen: [
        "Du verlässt die Stelle und willst das Zeugnis vor dem letzten Arbeitstag.",
        "Nach dem Ende des Arbeitsverhältnisses kam kein Zeugnis.",
        "Du hast früher dort gearbeitet und brauchst jetzt ein Zeugnis für eine Bewerbung.",
      ],
      caveats: [
        "Das Schreiben enthält nicht das Zeugnis selbst – es fordert es nur an. Den Inhalt schreibt der Arbeitgeber.",
        "Das Gesetz nennt keine Frist zur Ausstellung. Als angemessen gelten in der Regel einige Wochen.",
        "Prüfe das Zeugnis nach Erhalt: Bei Unrichtigkeit oder versteckter Negativformulierung besteht Anspruch auf Korrektur.",
        "Bei Streit über den Inhalt: Anwalt für Arbeitsrecht oder Betriebsrat fragen.",
      ],
      faq: [
        {
          question: "Habe ich einen gesetzlichen Anspruch?",
          answer:
            "Ja. § 630 BGB gibt bei Beendigung des Arbeitsverhältnisses einen Anspruch auf ein schriftliches Zeugnis. Es muss Art und Dauer der Tätigkeit enthalten; auf Verlangen auch Leistung und Verhalten.",
        },
        {
          question: "Unterschied einfach und qualifiziert?",
          answer:
            "Ein einfaches Zeugnis beschreibt nur Art und Dauer der Tätigkeit. Ein qualifiziertes Zeugnis bewertet zusätzlich Leistung und Verhalten. Für Bewerbungen ist das qualifizierte Zeugnis nützlicher.",
        },
        {
          question: "Was ist eine versteckte Formulierung?",
          answer:
            "Deutsche Zeugnisse haben eingespielte Formulierungen; kleine Abweichungen können eine negative Bewertung bedeuten. Wirkt etwas ungewöhnlich, Korrektur verlangen oder beraten lassen.",
        },
      ],
    },
  },
  keywords: {
    bg: ["Arbeitszeugnis", "свидетелство от работодател", "служебна характеристика", "напускане на работа"],
    de: ["Arbeitszeugnis anfordern", "Zeugnis Arbeitgeber", "qualifiziertes Zeugnis", "§ 630 BGB"],
  },
  sources: [
    { label: "§ 630 BGB — Zeugnis", url: "https://www.gesetze-im-internet.de/bgb/__630.html" },
    { label: "Arbeitsagentur — Arbeitszeugnis", url: "https://www.arbeitsagentur.de/" },
  ],
  build(facts) {
    const omitted: string[] = []
    const employer = facts[KEYS.employer]?.trim() ?? ""
    const position = facts[KEYS.position]?.trim() ?? ""
    const from = facts[KEYS.employmentFrom]?.trim() ?? ""
    const to = facts[KEYS.employmentTo]?.trim() ?? ""
    const kindRaw = facts[KEYS.referenceKind]?.trim().toLowerCase() ?? ""

    if (!employer) omitted.push(KEYS.employer)
    if (!from) omitted.push(KEYS.employmentFrom)
    if (!to) omitted.push(KEYS.employmentTo)

    const qualified = kindRaw === SIMPLE ? false : true
    const subject = employer ? `Anforderung eines Arbeitszeugnisses – ${employer}` : "Anforderung eines Arbeitszeugnisses"

    const paragraphs: string[] = []

    paragraphs.push(
      employer
        ? `hiermit bitte ich Sie, mir ein Arbeitszeugnis über meine Tätigkeit bei ${employer} auszustellen.`
        : "hiermit bitte ich Sie, mir ein Arbeitszeugnis über meine Tätigkeit auszustellen.",
    )

    if (position) {
      paragraphs.push(`Meine Position: ${position}.`)
    }

    if (from || to) {
      const fromText = from ? formatGermanDate(from) ?? from : null
      const toText = to ? formatGermanDate(to) ?? to : null
      if (fromText && toText) {
        paragraphs.push(`Das Arbeitsverhältnis bestand vom ${fromText} bis zum ${toText}.`)
      } else if (fromText) {
        paragraphs.push(`Das Arbeitsverhältnis besteht seit dem ${fromText}.`)
      } else if (toText) {
        paragraphs.push(`Das Arbeitsverhältnis endete am ${toText}.`)
      }
    }

    paragraphs.push(
      qualified
        ? "Ich bitte um ein qualifiziertes Zeugnis, das auch Angaben zu Leistung und Verhalten enthält (§ 630 BGB)."
        : "Ich bitte um ein einfaches Zeugnis mit Angaben zu Art und Dauer der Tätigkeit (§ 630 BGB).",
    )

    paragraphs.push(
      "Bitte senden Sie das Zeugnis an die oben genannte Adresse. Falls Sie eine bestimmte Form oder Vorlage verwenden, bin ich für einen kurzen Hinweis dankbar.",
    )

    return {
      subject,
      body: germanBusinessLetter({
        sender: { name: facts[KEYS.senderName], address: facts[KEYS.senderAddress] },
        recipient: { name: facts[KEYS.recipientName], address: facts[KEYS.recipientAddress] },
        placeDate: placeDateLine(facts[KEYS.place], formatGermanDate(facts[KEYS.date]) ?? ""),
        subject,
        paragraphs,
        signatureName: facts[KEYS.senderName] ?? null,
        omitted,
        senderKeys: { name: KEYS.senderName, address: KEYS.senderAddress },
        recipientKeys: { name: KEYS.recipientName, address: KEYS.recipientAddress },
      }),
      recipient: facts[KEYS.recipientName] ?? facts[KEYS.recipientAddress] ?? null,
      omittedFactKeys: [...new Set(omitted)],
    }
  },
}

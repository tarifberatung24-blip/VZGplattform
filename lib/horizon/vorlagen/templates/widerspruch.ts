/**
 * Widerspruch — objecting to an official decision.
 *
 * A Bescheid (a tax assessment, a benefit refusal, a fine) carries a deadline the
 * reader can easily miss: usually one month from delivery, and it is a hard
 * deadline. Once it passes, the decision becomes final and the objection is no
 * longer possible. So this letter has one job that outranks the others — it must
 * be sent in time — and one rule that follows from it: the letter never states
 * the deadline itself.
 *
 * The deadline runs from *delivery*, not from the date printed on the letter, and
 * only the reader knows when the envelope arrived. A generated date would be a
 * guess on the one date that decides whether the objection is admissible, so the
 * letter states the date of the decision as the reader gives it, asks for
 * acknowledgement, and leaves the deadline to the reader to check.
 */

import { germanBusinessLetter, placeDateLine } from "@/lib/horizon/letters/scaffold"
import { formatGermanDate } from "@/lib/horizon/letters/format"
import { COMMON_FIELD_KEYS, commonFields } from "../common-fields"
import type { VorlageTemplate } from "../types"

const KEYS = {
  ...COMMON_FIELD_KEYS,
  authority: "authority_name",
  decisionDate: "decision_date",
  reference: "decision_reference",
  decisionSubject: "decision_subject",
  reason: "objection_reason",
} as const

export const widerspruch: VorlageTemplate = {
  slug: "widerspruch",
  category: "authority",
  germanName: "Widerspruch",
  fields: [
    ...commonFields,
    {
      key: KEYS.authority,
      kind: "text",
      required: true,
      label: { bg: "Служба", de: "Behörde" },
      hint: { bg: "Службата, която издаде решението.", de: "Die Behörde, die den Bescheid erlassen hat." },
    },
    {
      key: KEYS.decisionDate,
      kind: "date",
      required: true,
      label: { bg: "Дата на решението", de: "Datum des Bescheids" },
      hint: {
        bg: "Датата, отпечатана на решението — не датата, на която си го получил.",
        de: "Das auf dem Bescheid gedruckte Datum – nicht das Datum des Erhalts.",
      },
    },
    {
      key: KEYS.reference,
      kind: "text",
      required: true,
      label: { bg: "Номер на преписката", de: "Aktenzeichen" },
      hint: { bg: "Номерът от решението, обикновено горе вляво.", de: "Die Nummer auf dem Bescheid, meist oben links." },
    },
    {
      key: KEYS.decisionSubject,
      kind: "text",
      required: false,
      label: { bg: "Какво се обжалва", de: "Wogegen" },
      hint: {
        bg: "Накратко какво е решението — например отказ за Wohngeld.",
        de: "Kurz, worum es im Bescheid geht – z. B. Ablehnung von Wohngeld.",
      },
    },
    {
      key: KEYS.reason,
      kind: "multiline",
      required: true,
      label: { bg: "Защо възразяваш", de: "Begründung" },
      hint: {
        bg: "Какво според теб е сгрешено. Може да се допълни по-късно с писмо.",
        de: "Was aus deiner Sicht falsch ist. Kann später schriftlich ergänzt werden.",
      },
    },
  ],
  content: {
    bg: {
      title: "Widerspruch — възражение срещу решение на служба",
      summary:
        "Възражение срещу Bescheid от немска служба, с номер на преписка и основание, преди да изтече едномесечният срок.",
      intro:
        "Ако служба отхвърли молба или издаде решение срещу теб — отказ за Wohngeld, данъчна оценка, глоба — можеш да възразиш. Възражението се нарича Widerspruch и се подава писмено до същата служба. Срокът обикновено е един месец от получаването и е твърд: след изтичането решението става окончателно.",
      useWhen: [
        "Служба е отхвърлила молба, с която не си съгласен.",
        "Получил си Bescheid с оценка или искане, което смяташ за погрешно.",
        "Искаш решението да бъде преразгледано, преди да платиш или преди да го приемеш.",
      ],
      caveats: [
        "Срокът е твърд — обикновено един месец от получаване на решението. Провери го на самия документ, защото той е меродавен.",
        "Писмото не спира изпълнението автоматично. Ако решението изисква плащане, попитай за Aufschiebende Wirkung или за разсрочване.",
        "Основанието може да се допълни по-късно писмено. По-важно е да подадеш възражението в срок.",
        "Това не е правна консултация. За сложни случаи — Sozialverband, Mieterverein или адвокат.",
      ],
      faq: [
        {
          question: "Колко е срокът за Widerspruch?",
          answer:
            "Обикновено един месец от получаване на решението (Bekanntgabe). Точният срок е изписан в самото решение — нарежда се Rechtsbehelfsbelehrung. Ако такава липсва, срокът може да е по-дълъг.",
        },
        {
          question: "Спира ли се изпълнението с възражението?",
          answer:
            "Не автоматично. Възражението не винаги има Aufschiebende Wirkung. Ако решението изисква плащане, поискай изрично спиране или разсрочване, за да не изтече срокът за плащане.",
        },
        {
          question: "Трябва ли да имам адвокат?",
          answer:
            "Не за самото подаване. Widerspruch може да подадеш сам. За сложни случаи — Sozialverband, Mieterverein или адвокат могат да помогнат, понякога безплатно за членове.",
        },
      ],
    },
    de: {
      title: "Widerspruch – gegen einen Bescheid vorgehen",
      summary:
        "Widerspruch gegen einen Bescheid mit Aktenzeichen und Begründung, bevor die Monatsfrist abläuft.",
      intro:
        "Lehnt eine Behörde einen Antrag ab oder erlässt einen Bescheid gegen dich – Ablehnung von Wohngeld, Steuerbescheid, Bußgeld – kannst du widersprechen. Der Widerspruch geht schriftlich an dieselbe Behörde. Die Frist beträgt meist einen Monat ab Bekanntgabe und ist hart: danach wird der Bescheid bestandskräftig.",
      useWhen: [
        "Eine Behörde hat einen Antrag abgelehnt und du bist nicht einverstanden.",
        "Du hast einen Bescheid mit einer aus deiner Sicht falschen Festsetzung erhalten.",
        "Du willst den Bescheid überprüfen lassen, bevor du zahlst oder ihn akzeptierst.",
      ],
      caveats: [
        "Die Frist ist hart – meist ein Monat ab Bekanntgabe. Prüfe sie auf dem Bescheid selbst; dieser ist maßgeblich.",
        "Der Widerspruch hemmt die Vollziehung nicht automatisch. Verlangt der Bescheid Zahlung, nach aufschiebender Wirkung oder Stundung fragen.",
        "Die Begründung kann später schriftlich nachgereicht werden. Wichtiger ist der fristgerechte Widerspruch.",
        "Dies ist keine Rechtsberatung. Bei komplexen Fällen: Sozialverband, Mieterverein oder Anwalt.",
      ],
      faq: [
        {
          question: "Wie lang ist die Widerspruchsfrist?",
          answer:
            "In der Regel ein Monat ab Bekanntgabe. Die genaue Frist steht im Bescheid – siehe Rechtsbehelfsbelehrung. Fehlt diese, kann die Frist länger sein.",
        },
        {
          question: "Hemmt der Widerspruch die Vollziehung?",
          answer:
            "Nicht automatisch. Der Widerspruch hat nicht immer aufschiebende Wirkung. Verlangt der Bescheid Zahlung, ausdrücklich Aussetzung oder Stundung beantragen, damit die Zahlungsfrist nicht abläuft.",
        },
        {
          question: "Brauche ich einen Anwalt?",
          answer:
            "Für die Einlegung nicht. Den Widerspruch kannst du selbst einlegen. Bei komplexen Fällen helfen Sozialverband, Mieterverein oder Anwalt – für Mitglieder teils kostenlos.",
        },
      ],
    },
  },
  keywords: {
    bg: ["Widerspruch", "възражение Bescheid", "обжалване решение служба", "Wohngeld отказ"],
    de: ["Widerspruch Bescheid", "Widerspruch einlegen", "Bescheid anfechten", "Rechtsbehelfsbelehrung"],
  },
  sources: [
    { label: "§ 68 VwGO — Vorverfahren", url: "https://www.gesetze-im-internet.de/vwgo/__68.html" },
    { label: "§ 70 VwGO — Frist und Form", url: "https://www.gesetze-im-internet.de/vwgo/__70.html" },
    { label: "§ 84 SGG — Widerspruch (Sozialrecht)", url: "https://www.gesetze-im-internet.de/sgg/__84.html" },
  ],
  build(facts) {
    const omitted: string[] = []
    const authority = facts[KEYS.authority]?.trim() ?? ""
    const decisionDate = facts[KEYS.decisionDate]?.trim() ?? ""
    const reference = facts[KEYS.reference]?.trim() ?? ""
    const decisionSubject = facts[KEYS.decisionSubject]?.trim() ?? ""
    const reason = facts[KEYS.reason]?.trim() ?? ""

    if (!authority) omitted.push(KEYS.authority)
    if (!decisionDate) omitted.push(KEYS.decisionDate)
    if (!reference) omitted.push(KEYS.reference)
    if (!reason) omitted.push(KEYS.reason)

    const subject = reference
      ? `Widerspruch gegen den Bescheid vom ${formatGermanDate(decisionDate) ?? ""} – Aktenzeichen ${reference}`
      : `Widerspruch gegen den Bescheid vom ${formatGermanDate(decisionDate) ?? ""}`

    const paragraphs: string[] = []

    paragraphs.push(
      reference
        ? `hiermit lege ich Widerspruch gegen den Bescheid vom ${formatGermanDate(decisionDate) ?? decisionDate} zum Aktenzeichen ${reference} ein.`
        : `hiermit lege ich Widerspruch gegen den Bescheid vom ${formatGermanDate(decisionDate) ?? decisionDate} ein.`,
    )

    if (decisionSubject) {
      paragraphs.push(`Der Bescheid betrifft: ${decisionSubject}.`)
    }

    paragraphs.push(
      reason
        ? `Begründung: ${reason}`
        : "Eine Begründung reiche ich innerhalb der Widerspruchsfrist schriftlich nach.",
    )

    paragraphs.push(
      "Ich bitte um schriftliche Bestätigung des Eingangs dieses Widerspruchs sowie um Mitteilung, ob dem Widerspruch abgeholfen wird oder ob die Sache der Widerspruchsbehörde vorgelegt wird.",
    )

    return {
      subject,
      body: germanBusinessLetter({
        sender: { name: facts[KEYS.senderName], address: facts[KEYS.senderAddress] },
        recipient: { name: facts[KEYS.recipientName] ?? authority ?? null, address: facts[KEYS.recipientAddress] },
        placeDate: placeDateLine(facts[KEYS.place], formatGermanDate(facts[KEYS.date]) ?? ""),
        subject,
        paragraphs,
        signatureName: facts[KEYS.senderName] ?? null,
        omitted,
        senderKeys: { name: KEYS.senderName, address: KEYS.senderAddress },
        recipientKeys: { name: KEYS.recipientName, address: KEYS.recipientAddress },
      }),
      recipient: facts[KEYS.recipientName] ?? authority ?? null,
      omittedFactKeys: [...new Set(omitted)],
    }
  },
}

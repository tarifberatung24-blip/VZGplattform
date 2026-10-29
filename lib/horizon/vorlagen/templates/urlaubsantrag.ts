/**
 * Urlaubsantrag — applying for leave.
 *
 * The shortest letter in the set, and the one people most often send as a chat
 * message. That is usually fine, until it is not: when a dispute arises about
 * whether leave was approved, or whether it was applied for at all, only a dated
 * written request with the employer's reply is evidence. The letter exists to
 * create that record without making the reader write German prose.
 *
 * It states the dates the reader chose and asks for written confirmation. It does
 * not state the reader's remaining leave entitlement — that number lives in the
 * employer's system and in § 4 BUrlG, and a wrong figure printed in the letter
 * would weaken the request rather than support it.
 */

import { germanBusinessLetter, placeDateLine } from "@/lib/horizon/letters/scaffold"
import { formatGermanDate } from "@/lib/horizon/letters/format"
import { COMMON_FIELD_KEYS, commonFields } from "../common-fields"
import type { VorlageTemplate } from "../types"

const KEYS = {
  ...COMMON_FIELD_KEYS,
  leaveFrom: "leave_from",
  leaveTo: "leave_to",
  workingDays: "leave_working_days",
  remainingDays: "leave_remaining_days",
  substitute: "leave_substitute",
} as const

export const urlaubsantrag: VorlageTemplate = {
  slug: "urlaubsantrag",
  category: "work",
  germanName: "Urlaubsantrag",
  fields: [
    ...commonFields,
    {
      key: KEYS.leaveFrom,
      kind: "date",
      required: true,
      label: { bg: "Отпуск от", de: "Urlaub von" },
    },
    {
      key: KEYS.leaveTo,
      kind: "date",
      required: true,
      label: { bg: "Отпуск до", de: "Urlaub bis" },
    },
    {
      key: KEYS.workingDays,
      kind: "text",
      required: false,
      label: { bg: "Работни дни", de: "Arbeitstage" },
      hint: {
        bg: "Брой работни дни, които отпускът покрива. Остави празно, ако не си ги броил.",
        de: "Anzahl der Arbeitstage. Leer lassen, wenn nicht gezählt.",
      },
    },
    {
      key: KEYS.remainingDays,
      kind: "text",
      required: false,
      label: { bg: "Оставащи дни отпуск", de: "Resturlaub" },
      hint: {
        bg: "Само ако си сигурен от ведомостта. Иначе остави празно — числото не се измисля.",
        de: "Nur wenn aus der Abrechnung bekannt. Sonst leer lassen – die Zahl wird nicht erfunden.",
      },
    },
    {
      key: KEYS.substitute,
      kind: "text",
      required: false,
      label: { bg: "Заместващ колега", de: "Vertretung" },
      hint: { bg: "Кой поема задачите по време на отпуска.", de: "Wer die Aufgaben übernimmt." },
    },
  ],
  content: {
    bg: {
      title: "Urlaubsantrag — заявление за отпуск",
      summary:
        "Писмено заявление за отпуск с точни дати и искане за писмено потвърждение, за да е ясно кога отпускът е одобрен.",
      intro:
        "Отпускът се иска навреме и писмено. Устната договорка работи, докато не се появи спор за датите или за това дали отпускът е бил одобрен. Писменото заявление с дата и потвърждение от работодателя премахва този спор. То не изисква немски — попълваш датите и го изпращаш.",
      useWhen: [
        "Искаш отпуск и искаш писмено потвърждение за датите.",
        "Работодателят е устно съгласен, но искаш да го има черно на бяло.",
        "Планираш по-дълъг отпуск и искаш да си сигурен, че е одобрен преди да купиш билети.",
      ],
      caveats: [
        "Заявлението не е автоматично одобрение. Отпускът е одобрен, когато работодателят потвърди.",
        "Работодателят може да откаже по спешни оперативни причини; тогава трябва да обсъдите алтернативни дати.",
        "Не посочвай оставащи дни, ако не си сигурен. Грешна цифра отслабва заявлението.",
        "Отпускът се иска достатъчно рано — обикновено поне две седмици преди началото, ако няма друга уредба.",
      ],
      faq: [
        {
          question: "Колко рано трябва да подам заявлението?",
          answer:
            "Законът не дава точно число, но заявлението трябва да е достатъчно рано, за да може работодателят да планира. Обикновено се приемат поне две седмици; провери в трудовия договор или в Betriebsvereinbarung.",
        },
        {
          question: "Може ли работодателят да откаже?",
          answer:
            "Да, по спешни оперативни причини или ако други колеги вече имат одобрен отпуск за същия период. Тогава се търсят алтернативни дати.",
        },
        {
          question: "Имам ли право на отпуск още в първата година?",
          answer:
            "Да, но при частично право през първата година. Пълното право се натрупва. Провери § 4 BUrlG и трудовия договор.",
        },
      ],
    },
    de: {
      title: "Urlaubsantrag – Urlaub schriftlich beantragen",
      summary:
        "Schriftlicher Urlaubsantrag mit genauen Daten und Bitte um schriftliche Bestätigung, damit die Genehmigung nachweisbar ist.",
      intro:
        "Urlaub wird rechtzeitig und schriftlich beantragt. Eine mündliche Absprache funktioniert, bis ein Streit über die Daten oder die Genehmigung entsteht. Ein datierter Antrag mit Bestätigung beseitigt diesen Streit. Er verlangt kein Deutsch – Daten eintragen und absenden.",
      useWhen: [
        "Du willst Urlaub und eine schriftliche Bestätigung der Daten.",
        "Der Arbeitgeber hat mündlich zugestimmt und du willst es schriftlich.",
        "Du planst längeren Urlaub und willst die Genehmigung vor der Buchung.",
      ],
      caveats: [
        "Ein Antrag ist keine automatische Genehmigung. Genehmigt ist der Urlaub erst mit der Bestätigung.",
        "Der Arbeitgeber kann aus dringenden betrieblichen Gründen ablehnen; dann sind Alternativtermine zu klären.",
        "Resturlaub nur angeben, wenn sicher. Eine falsche Zahl schwächt den Antrag.",
        "Rechtzeitig beantragen – in der Regel mindestens zwei Wochen vor Beginn, sofern nichts anderes geregelt ist.",
      ],
      faq: [
        {
          question: "Wie früh muss ich beantragen?",
          answer:
            "Das Gesetz nennt keine feste Zahl, aber der Antrag muss so früh kommen, dass der Arbeitgeber planen kann. Üblich sind mindestens zwei Wochen; Vertrag oder Betriebsvereinbarung prüfen.",
        },
        {
          question: "Kann der Arbeitgeber ablehnen?",
          answer:
            "Ja, aus dringenden betrieblichen Gründen oder wenn Kollegen für denselben Zeitraum bereits genehmigten Urlaub haben. Dann sind Alternativtermine zu suchen.",
        },
        {
          question: "Habe ich im ersten Jahr Anspruch?",
          answer:
            "Ja, aber anteilig im ersten Jahr. Der volle Anspruch wächst an. § 4 BUrlG und den Arbeitsvertrag prüfen.",
        },
      ],
    },
  },
  keywords: {
    bg: ["Urlaubsantrag", "заявление за отпуск", "отпуск Германия", "работни дни отпуск"],
    de: ["Urlaubsantrag", "Urlaub beantragen", "Urlaub Arbeitgeber", "Resturlaub"],
  },
  sources: [
    { label: "Bundesurlaubsgesetz (BUrlG)", url: "https://www.gesetze-im-internet.de/burlg/" },
    { label: "§ 4 BUrlG — Dauer des Urlaubs", url: "https://www.gesetze-im-internet.de/burlg/__4.html" },
  ],
  build(facts) {
    const omitted: string[] = []
    const from = facts[KEYS.leaveFrom]?.trim() ?? ""
    const to = facts[KEYS.leaveTo]?.trim() ?? ""
    const workingDays = facts[KEYS.workingDays]?.trim() ?? ""
    const remaining = facts[KEYS.remainingDays]?.trim() ?? ""
    const substitute = facts[KEYS.substitute]?.trim() ?? ""

    if (!from) omitted.push(KEYS.leaveFrom)
    if (!to) omitted.push(KEYS.leaveTo)

    const fromText = from ? formatGermanDate(from) ?? from : null
    const toText = to ? formatGermanDate(to) ?? to : null

    const subject = "Urlaubsantrag"

    const paragraphs: string[] = []

    if (fromText && toText) {
      paragraphs.push(`hiermit beantrage ich Urlaub vom ${fromText} bis zum ${toText}.`)
    } else if (fromText) {
      paragraphs.push(`hiermit beantrage ich Urlaub ab dem ${fromText}.`)
    } else if (toText) {
      paragraphs.push(`hiermit beantrage ich Urlaub bis zum ${toText}.`)
    } else {
      paragraphs.push("hiermit beantrage ich Urlaub. Die genauen Daten reiche ich nach.")
    }

    if (workingDays && /^\d{1,3}$/.test(workingDays)) {
      paragraphs.push(`Der Antrag umfasst ${workingDays} Arbeitstage.`)
    }

    if (remaining && /^\d{1,3}$/.test(remaining)) {
      paragraphs.push(`Mein Resturlaub beträgt nach meiner Kenntnis ${remaining} Tage.`)
    }

    if (substitute) {
      paragraphs.push(`Als Vertretung ist ${substitute} vorgesehen.`)
    }

    paragraphs.push("Ich bitte um schriftliche Bestätigung dieses Antrags.")

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

/**
 * Mängelanzeige — reporting a defect to the landlord.
 *
 * This is the letter a tenant sends so that the landlord is formally in default
 * (`Verzug`), which is the precondition for withholding rent, claiming repair
 * costs or terminating for cause. Sending it as a phone call or a chat message is
 * the mistake the letter exists to prevent: without a written, dated notice the
 * tenant cannot prove the landlord was told, and the deadline they thought had
 * started never did.
 *
 * The letter therefore states three things and refuses a fourth. It states the
 * defect, since when it exists, and what the tenant asks for. It refuses to state
 * a *repair deadline as a legal entitlement* — a fixed period the tenant may set
 * (`Frist`) depends on the individual case, and printing a number would present a
 * self-chosen date as a legal one. The template offers a period the tenant
 * chooses and labels it as the tenant's own request, not a statutory rule.
 */

import { germanBusinessLetter, placeDateLine } from "@/lib/horizon/letters/scaffold"
import { formatGermanDate } from "@/lib/horizon/letters/format"
import { COMMON_FIELD_KEYS, commonFields } from "../common-fields"
import type { VorlageTemplate } from "../types"

const KEYS = {
  ...COMMON_FIELD_KEYS,
  rentalProperty: "rental_property",
  defect: "defect_description",
  noticedSince: "defect_since",
  deadlineWeeks: "requested_deadline_weeks",
  accessGranted: "access_granted",
} as const

export const mangelanzeige: VorlageTemplate = {
  slug: "mangelanzeige",
  category: "housing",
  germanName: "Mängelanzeige",
  fields: [
    ...commonFields,
    {
      key: KEYS.rentalProperty,
      kind: "text",
      required: true,
      label: { bg: "Кой имот", de: "Welche Wohnung" },
      hint: {
        bg: "Адресът на жилището и номерът на апартамента, ако има такъв.",
        de: "Adresse der Wohnung und ggf. Wohnungsnummer.",
      },
    },
    {
      key: KEYS.defect,
      kind: "multiline",
      required: true,
      label: { bg: "Какъв е дефектът", de: "Welcher Mangel" },
      hint: {
        bg: "Какво е счупено или не работи и къде в жилището. Колкото по-точно, толкова по-добре.",
        de: "Was defekt ist und wo in der Wohnung. Je genauer, desto besser.",
      },
    },
    {
      key: KEYS.noticedSince,
      kind: "date",
      required: false,
      label: { bg: "Откога съществува", de: "Seit wann besteht er" },
      hint: {
        bg: "Ако не е сигурно, остави празно — не се измисля дата.",
        de: "Wenn unsicher, leer lassen – es wird kein Datum erfunden.",
      },
    },
    {
      key: KEYS.deadlineWeeks,
      kind: "text",
      required: false,
      label: { bg: "Искаш срок за отстраняване (седмици)", de: "Gewünschte Frist zur Behebung (Wochen)" },
      hint: {
        bg: "Твоето искане, не законов срок. Остави празно за срок от две седмици.",
        de: "Deine Bitte, keine gesetzliche Frist. Leer lassen für zwei Wochen.",
      },
    },
    {
      key: KEYS.accessGranted,
      kind: "text",
      required: false,
      label: { bg: "Кога може да се влезе за оглед", de: "Wann ein Termin möglich ist" },
      hint: {
        bg: "Например „всеки делничен ден след 17:00“. Остави празно, ако не искаш да предлагаш.",
        de: "Zum Beispiel „werktags ab 17 Uhr“. Leer lassen, wenn kein Vorschlag gewünscht ist.",
      },
    },
  ],
  content: {
    bg: {
      title: "Mängelanzeige — съобщаване на дефект на наемодателя",
      summary:
        "Писмено съобщение до наемодателя за дефект в жилището, с дата и искане за отстраняване — за да е доказано, че той е бил уведомен.",
      intro:
        "Ако в жилището има дефект — теч, повреда на отоплението, мухъл, счупен прозорец — наемодателят трябва да бъде уведомен писмено. Обаждане или съобщение не доказват нищо, ако по-късно се стигне до спор. Това писмо създава доказателството: то казва какъв е дефектът, откога съществува и какво искаш.",
      useWhen: [
        "Дефектът е в жилището и наемодателят още не знае за него или не е реагирал.",
        "Искаш да намалиш наема или да искаш разноски за ремонт по-късно.",
        "Нуждаеш се от писмено доказателство, че си уведомил наемодателя.",
      ],
      caveats: [
        "Писмото не намалява наема автоматично. Намаляването е отделно решение и зависи от случая.",
        "Срокът в писмото е твое искане, не законов срок. Законът не определя еднакъв срок за всички дефекти.",
        "Запази копие и доказателство за изпращането — препоръчано писмо с обратна разписка или Einwurf-Einschreiben.",
        "Ако дефектът е опасен за здравето или живота, уведоми и наемодателя, и съответната служба незабавно.",
      ],
      faq: [
        {
          question: "Трябва ли да изпратя писмото с препоръчана поща?",
          answer:
            "За доказване на уведомяването да. Einwurf-Einschreiben или Einschreiben mit Rückschein дава доказателство кога е изпратено и кога е получено. Обикновена поща не доказва нищо.",
        },
        {
          question: "Мога ли веднага да спра да плащам наема?",
          answer:
            "Не. Спирането на наема без правно основание може да доведе до прекратяване на договора. Първо уведоми писмено и поискай отстраняване; за намаляване се консултирай с Mieterverein или адвокат.",
        },
        {
          question: "Какво означава, че наемодателят изпада в Verzug?",
          answer:
            "Ако не отстрани дефекта в разумен срок след писменото уведомление, той изпада в забава. Това е предпоставката да поискаш да извършиш ремонта сам за негова сметка или да претендираш разноски.",
        },
      ],
    },
    de: {
      title: "Mängelanzeige – Mangel beim Vermieter anzeigen",
      summary:
        "Schriftliche Mängelanzeige an den Vermieter mit Datum und Aufforderung zur Behebung – damit die Kenntnisnahme nachweisbar ist.",
      intro:
        "Ist in der Wohnung etwas defekt – ein Wasserschaden, die Heizung, Schimmel, ein kaputtes Fenster – muss der Vermieter dies schriftlich erfahren. Ein Anruf oder eine Nachricht beweist später nichts. Dieses Schreiben schafft den Nachweis: Es benennt den Mangel, seit wann er besteht und was verlangt wird.",
      useWhen: [
        "In der Wohnung besteht ein Mangel und der Vermieter weiß noch nichts davon oder reagiert nicht.",
        "Du willst später die Miete mindern oder Reparaturkosten geltend machen.",
        "Du brauchst einen Nachweis, dass du den Vermieter informiert hast.",
      ],
      caveats: [
        "Das Schreiben mindert die Miete nicht automatisch. Eine Minderung ist eine eigene Entscheidung und hängt vom Einzelfall ab.",
        "Die genannte Frist ist deine Bitte, keine gesetzliche Frist. Das Gesetz nennt keine einheitliche Frist für alle Mängel.",
        "Behalte eine Kopie und den Sendenachweis – Einwurf-Einschreiben oder Einschreiben mit Rückschein.",
        "Ist der Mangel gesundheits- oder lebensgefährlich, informiere zusätzlich sofort die zuständige Stelle.",
      ],
      faq: [
        {
          question: "Muss ich per Einschreiben senden?",
          answer:
            "Für den Nachweis der Zustellung ja. Einwurf-Einschreiben oder Einschreiben mit Rückschein belegt, wann gesendet und wann zugestellt wurde. Ein normaler Brief belegt nichts.",
        },
        {
          question: "Kann ich sofort die Miete einbehalten?",
          answer:
            "Nein. Ein Einbehalt ohne Rechtsgrund kann zur Kündigung führen. Erst schriftlich anzeigen und Behebung verlangen; zur Minderung Mieterverein oder Anwalt fragen.",
        },
        {
          question: "Was bedeutet Verzug des Vermieters?",
          answer:
            "Behebt er den Mangel nicht innerhalb einer angemessenen Frist nach der Anzeige, kommt er in Verzug. Das ist die Voraussetzung, um selbst zu reparieren und die Kosten zu verlangen.",
        },
      ],
    },
  },
  keywords: {
    bg: ["Mängelanzeige", "дефект в жилище", "наемодател", "ремонт наем", "оплакване от наемодател"],
    de: ["Mängelanzeige", "Mangel Wohnung", "Vermieter Mangel melden", "Schimmel melden", "Heizung defekt"],
  },
  sources: [
    { label: "§ 536 BGB — Minderung", url: "https://www.gesetze-im-internet.de/bgb/__536.html" },
    { label: "§ 535 BGB — Pflichten des Vermieters", url: "https://www.gesetze-im-internet.de/bgb/__535.html" },
    { label: "Verbraucherzentrale — Wohnungsmängel", url: "https://www.verbraucherzentrale.de/" },
  ],
  build(facts) {
    const omitted: string[] = []
    const defect = facts[KEYS.defect]?.trim() ?? ""
    const property = facts[KEYS.rentalProperty]?.trim() ?? ""
    const since = facts[KEYS.noticedSince]?.trim() ?? ""
    const weeksRaw = facts[KEYS.deadlineWeeks]?.trim() ?? ""
    const access = facts[KEYS.accessGranted]?.trim() ?? ""

    if (!defect) omitted.push(KEYS.defect)
    if (!property) omitted.push(KEYS.rentalProperty)
    if (!since) omitted.push(KEYS.noticedSince)

    const subject = property ? `Mängelanzeige – ${property}` : "Mängelanzeige"

    // A period the tenant chooses is presented as the tenant's request. Parsing it
    // is deliberately narrow: anything that is not a plain number of weeks falls
    // back to two weeks rather than guessing at "bald" or "asap".
    const weeks = /^\d{1,2}$/.test(weeksRaw) ? Number(weeksRaw) : 2
    const deadlineSentence =
      weeks > 0
        ? `Ich bitte Sie, den Mangel innerhalb von ${weeks} ${weeks === 1 ? "Woche" : "Wochen"} zu beheben. Dies ist meine Frist, keine gesetzliche Frist.`
        : "Ich bitte Sie, den Mangel unverzüglich zu beheben."

    const paragraphs: string[] = []

    paragraphs.push(
      property
        ? `hiermit zeige ich einen Mangel in der von mir gemieteten Wohnung an: ${property}.`
        : "hiermit zeige ich einen Mangel in der von mir gemieteten Wohnung an.",
    )

    paragraphs.push(
      defect
        ? `Der Mangel: ${defect}`
        : "Der Mangel wird nachgereicht; ich bitte Sie, mich zur genauen Beschreibung zu kontaktieren.",
    )

    if (since) {
      paragraphs.push(`Der Mangel besteht seit dem ${formatGermanDate(since) ?? since}.`)
    }

    paragraphs.push(deadlineSentence)

    if (access) {
      paragraphs.push(`Für eine Besichtigung oder Reparatur stehe ich zur Verfügung: ${access}.`)
    }

    paragraphs.push(
      "Ich bitte Sie um eine schriftliche Bestätigung des Eingangs dieser Anzeige und um Mitteilung, wann der Mangel behoben wird.",
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

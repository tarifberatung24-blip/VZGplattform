/**
 * SCHUFA self-disclosure parser and score planner.
 *
 * Deterministic by design: the same document produces the same plan. A SCHUFA
 * entry decides whether a person gets a flat, a phone contract or a loan, so the
 * advice that follows it has to be reproducible and auditable, not a plausible
 * paragraph a model produced. No model is consulted here.
 *
 * Two hard rules, inherited from the Inkasso rule pack:
 *
 * 1. Never invent an entry. A section that is not recognised contributes nothing
 *    rather than a guessed one, and the caller reports what could not be read.
 * 2. Never promise a score. A SCHUFA score is a proprietary figure and no public
 *    rule maps entries to points. The plan therefore speaks of *effect on your
 *    creditworthiness* and of the *free legal route* (Art. 15 DSGVO data copy,
 *    § 34 BDSG), never of a number that will be reached.
 */

import type { Locale } from "@/lib/i18n/dictionaries"

export const SCHUFA_PACK_VERSION = "1.0.0"

export const SCHUFA_DISCLAIMER =
  "Това е структуриран преглед на твоята SCHUFA справка, а не правна или финансова консултация. " +
  "SCHUFA не публикува как се изчислява оценката, затова планът говори за влияние върху платежоспособността, " +
  "а не за точки. / Dies ist eine strukturierte Auswertung deiner SCHUFA-Auskunft und keine Rechts- oder " +
  "Finanzberatung. SCHUFA veröffentlicht die Score-Berechnung nicht, deshalb spricht der Plan von Wirkung auf " +
  "die Bonität, nicht von Punkten."

export const SCHUFA_FREE_APPLICATION_URL = "https://www.meineschufa.de/datenkopie"

/** The categories a SCHUFA data copy can contain. Order is display order. */
export const SCHUFA_CATEGORIES = [
  "personal",
  "address",
  "accounts",
  "negative",
  "inquiries",
  "insolvency",
] as const

export type SchufaCategory = (typeof SCHUFA_CATEGORIES)[number]

export const SCHUFA_CATEGORY_LABEL: Record<SchufaCategory, Record<Locale, string>> = {
  personal: { bg: "Лични данни", de: "Personendaten" },
  address: { bg: "Адреси", de: "Adressen" },
  accounts: { bg: "Банкови сметки и кредити", de: "Konten und Kredite" },
  negative: { bg: "Негативни записи", de: "Negativmerkmale" },
  inquiries: { bg: "Запитвания", de: "Anfragen" },
  insolvency: { bg: "Insolvenz", de: "Insolvenz" },
}

export type SchufaEntry = {
  category: SchufaCategory
  /** The raw line, kept so the user can find it in their own document. */
  text: string
}

export type SchufaParseResult = {
  entries: SchufaEntry[]
  /** Categories a marker hinted at but whose line could not be read. */
  unreadable: SchufaCategory[]
  /** True when nothing at all was recognised. */
  empty: boolean
}

export type SchufaActionKind = "wait" | "check" | "settle" | "dispute" | "avoid" | "prove"

export type SchufaAction = {
  id: string
  category: SchufaCategory
  kind: SchufaActionKind
  title: Record<Locale, string>
  detail: Record<Locale, string>
  /** Roughly how long this step takes to change the record, where known. */
  horizon: Record<Locale, string> | null
}

export type SchufaPlan = {
  entries: SchufaEntry[]
  unreadable: SchufaCategory[]
  empty: boolean
  /** Which categories have at least one entry, in canonical order. */
  present: SchufaCategory[]
  actions: SchufaAction[]
  /** Non-action facts the user should know, always shown. */
  notes: Record<Locale, string>[]
  packVersion: string
  disclaimer: string
}

/**
 * Markers per category. Matching is deliberately loose on the German term and
 * strict on meaning: `Negativmerkmale` is the section SCHUFA itself uses for
 * adverse entries, so a line under it is reported as negative even when the
 * wording of the individual entry is unusual.
 */
const CATEGORY_MARKERS: Record<SchufaCategory, RegExp> = {
  personal: /(personendaten|personal data|geb(?:urts)?datum|date of birth|name und vorname|лични данни)/i,
  address: /(anschrift|adresse|address|wohnhaft|melderegister|адрес)/i,
  accounts: /(kredit|darlehen|giro|kontokorrent|ratenkredit|leasing|kreditkarte|konto|account|loan|credit card|кредит|сметка)/i,
  negative: /(negativmerkmal|zahlungsst(?:ö|o)rung|zahlungsausfall|mahnverfahren|inkasso|tituliert|f(?:o|ö)rderung|negative|adverse|негатив|просрочие)/i,
  inquiries: /(anfrage|konditionsanfrage|bonit(?:ä|a)tspr(?:ü|u)fung|anfragen|inquir|запитв)/i,
  insolvency: /(insolvenz|ruh(?:e|en)ndes gewerbe|privatinsolvenz|schuldenbereinigung|insolvency|несъстоятелност)/i,
}

/** Markers that a category heading was seen even when its value line was not. */
function classifyLine(line: string): SchufaCategory | null {
  for (const category of SCHUFA_CATEGORIES) {
    if (CATEGORY_MARKERS[category].test(line)) return category
  }
  return null
}

/**
 * Section titles a SCHUFA data copy uses, per category.
 *
 * These are full titles, not the loose markers below, and they are the primary
 * segmentation signal. The reason is extraction: `extractPdfText` collapses all
 * whitespace, so a real data copy reaches the parser as one long line. Splitting on
 * line breaks alone would put the whole document into the first category. Splitting
 * on the section titles instead recovers the structure the PDF lost.
 */
const SECTION_HEADINGS: ReadonlyArray<{ category: SchufaCategory; pattern: RegExp }> = [
  { category: "personal", pattern: /Personendaten|Personenbezogene Daten|Personal data|Лични данни/gi },
  { category: "address", pattern: /Anschriften|Anschrift|Adressen|Adresse|Addresses|Address|Адреси|Адрес/gi },
  { category: "accounts", pattern: /Konten und Kredite|Kreditkonten|Kontoinformationen|Konten|Accounts and credits|Сметки и кредити|Кредити/gi },
  { category: "negative", pattern: /Negativmerkmale|Zahlungsst(?:ö|o)rungen|Zahlungsausf(?:ä|a)lle|Adverse entries|Негативни записи|Просрочия/gi },
  { category: "inquiries", pattern: /Anfragen zur Kreditkondition|Konditionsanfragen|Anfragen|Inquiries|Запитвания/gi },
  { category: "insolvency", pattern: /Insolvenzverfahren|Privatinsolvenz|Insolvenzen|Insolvency|Несъстоятелност/gi },
]

type Section = { category: SchufaCategory | null; body: string }

/**
 * Splits the document at section titles.
 *
 * Everything before the first title is the preamble and carries no category. Two
 * titles of the same category are merged, because SCHUFA repeats a section when a
 * data copy spans pages.
 */
function splitSections(text: string): Section[] {
  const hits: Array<{ index: number; length: number; category: SchufaCategory }> = []
  for (const { category, pattern } of SECTION_HEADINGS) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      hits.push({ index: match.index ?? 0, length: match[0].length, category })
    }
  }
  hits.sort((a, b) => a.index - b.index)

  const sections: Section[] = []
  let cursor = 0
  let current: SchufaCategory | null = null
  for (const hit of hits) {
    if (hit.index < cursor) continue
    sections.push({ category: current, body: text.slice(cursor, hit.index) })
    current = hit.category
    cursor = hit.index + hit.length
  }
  sections.push({ category: current, body: text.slice(cursor) })
  return sections
}

/**
 * Parses the text of a SCHUFA data copy into categorised entries.
 *
 * The document is first split at its section titles, which works whether the text
 * kept its line breaks or arrived collapsed into one line. A line inside a section
 * inherits that section's category; a line in the preamble is attributed by its own
 * marker when it has one. A line with neither is skipped: an unattributed line is
 * not guessed into a category.
 */
export function parseSchufaText(text: string): SchufaParseResult {
  const entries: SchufaEntry[] = []
  const unreadable: SchufaCategory[] = []

  for (const section of splitSections(text)) {
    const lines = section.body
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= 3)

    if (!section.category) {
      for (const line of lines) {
        const marker = classifyLine(line)
        if (marker) entries.push({ category: marker, text: line })
      }
      continue
    }

    if (!lines.length) {
      unreadable.push(section.category)
      continue
    }
    for (const line of lines) entries.push({ category: section.category, text: line })
  }

  return {
    entries,
    unreadable: [...new Set(unreadable)],
    empty: entries.length === 0,
  }
}

const ACTIONS: Record<SchufaCategory, SchufaAction> = {
  negative: {
    id: "negative-settle-or-dispute",
    category: "negative",
    kind: "settle",
    title: { bg: "Изчисти негативните записи", de: "Negativmerkmale bereinigen" },
    detail: {
      bg: "Плати или уреди спора по всеки негативен запис. След уреждане поискай от кредитора писмено потвърждение, че вземането е погасено, и го изпрати на SCHUFA, за да отбележи записа като „erledigt“. Ако записът е неоснователен, поискай изтриване.",
      de: "Zahle oder kläre jeden Negativmerkmal. Nach der Erledigung vom Gläubiger eine schriftliche Bestätigung anfordern und an SCHUFA senden, damit der Eintrag als „erledigt“ vermerkt wird. Ist der Eintrag unberechtigt, die Löschung verlangen.",
    },
    horizon: { bg: "обикновено 3–6 месеца след уреждане", de: "meist 3–6 Monate nach Erledigung" },
  },
  insolvency: {
    id: "insolvency-wait",
    category: "insolvency",
    kind: "wait",
    title: { bg: "Изчакай изтичането на срока за Insolvenz", de: "Löschfrist der Insolvenz abwarten" },
    detail: {
      bg: "Insolvenz записите се изтриват след законов срок (обикновено три години след приключване на производството). Провери точната дата в справката и си отбележи кога отпада. През това време избягвай нови заявления, които няма да бъдат одобрени.",
      de: "Insolvenzeinträge werden nach der gesetzlichen Frist gelöscht (meist drei Jahre nach Beendigung des Verfahrens). Das genaue Datum in der Auskunft prüfen und notieren. In der Zwischenzeit keine Anträge stellen, die ohnehin abgelehnt werden.",
    },
    horizon: { bg: "до изтичане на законовия срок", de: "bis zum Ablauf der gesetzlichen Frist" },
  },
  inquiries: {
    id: "inquiries-avoid",
    category: "inquiries",
    kind: "avoid",
    title: { bg: "Ограничи новите запитвания", de: "Neue Anfragen begrenzen" },
    detail: {
      bg: "Всяко твърдо запитване (Konditionsanfrage) оставя следа. Сравнявай оферти само чрез запитвания без последствия, например „Konditionsanfrage“, и не подавай много кредитни молби в кратък срок.",
      de: "Jede Konditionsanfrage hinterlässt eine Spur. Angebote nur über unverbindliche Anfragen vergleichen und nicht mehrere Kreditanfragen in kurzer Zeit stellen.",
    },
    horizon: { bg: "следата избледнява с времето", de: "die Spur verblasst mit der Zeit" },
  },
  accounts: {
    id: "accounts-check",
    category: "accounts",
    kind: "check",
    title: { bg: "Провери активните кредити", de: "Aktive Kredite prüfen" },
    detail: {
      bg: "Провери дали всеки кредит и всяка сметка са твои и дали данните са верни. Приключен кредит трябва да е отбелязан като погасен. Грешка в сума или статус може да се оспори.",
      de: "Prüfen, ob jeder Kredit und jedes Konto korrekt ist. Ein abbezahlter Kredit muss als erledigt vermerkt sein. Ein falscher Betrag oder Status kann beanstandet werden.",
    },
    horizon: { bg: "зависи от кредитора", de: "abhängig vom Gläubiger" },
  },
  address: {
    id: "address-check",
    category: "address",
    kind: "prove",
    title: { bg: "Изчисти старите адреси", de: "Alte Adressen bereinigen" },
    detail: {
      bg: "Провери дали адресите са верни. Ако някой стар адрес не е твой, поискай корекция — грешен адрес може да свърже чужда информация с теб.",
      de: "Prüfen, ob die Adressen korrekt sind. Ist eine alte Adresse nicht deine, die Korrektur verlangen – eine falsche Adresse kann fremde Informationen mit dir verbinden.",
    },
    horizon: { bg: "няколко седмици", de: "wenige Wochen" },
  },
  personal: {
    id: "personal-prove",
    category: "personal",
    kind: "prove",
    title: { bg: "Провери личните данни", de: "Personendaten prüfen" },
    detail: {
      bg: "Сравни името, датата на раждане и номерата с твоите документи. Данните за самоличност не влияят пряко на оценката, но грешка в тях може да смеси твоята информация с чужда.",
      de: "Name, Geburtsdatum und Nummern mit deinen Dokumenten abgleichen. Identitätsdaten beeinflussen die Bonität nicht direkt, aber ein Fehler kann deine Daten mit fremden vermischen.",
    },
    horizon: null,
  },
}

const BASE_NOTES: Record<Locale, string>[] = [
  {
    bg: "Безплатната справка по чл. 15 DSGVO (Datenkopie) е твое право и е достатъчна за този план. Платените „проверки на оценка“ не са задължителни.",
    de: "Die kostenlose Datenkopie nach Art. 15 DSGVO ist dein Recht und für diesen Plan ausreichend. Bezahlte „Score-Checks“ sind nicht erforderlich.",
  },
  {
    bg: "SCHUFA не публикува как се изчислява оценката, затова никой не може честно да ти обещае конкретни точки. Планът подобрява условията, а решението остава на кредитора.",
    de: "SCHUFA veröffentlicht die Score-Berechnung nicht, deshalb kann dir niemand ehrlich konkrete Punkte versprechen. Der Plan verbessert die Voraussetzungen; die Entscheidung bleibt beim Kreditgeber.",
  },
]

/**
 * Builds the recovery plan from a parsed document.
 *
 * Actions are derived from the categories that are actually present, so the plan
 * is about the user's own record rather than a generic checklist. The notes are
 * always shown, because the two things a person most often gets wrong — paying
 * for a check they are entitled to free, and believing a promised score — are not
 * tied to any single entry.
 */
export function buildSchufaPlan(parsed: SchufaParseResult): SchufaPlan {
  const present = SCHUFA_CATEGORIES.filter((category) =>
    parsed.entries.some((entry) => entry.category === category),
  )

  const order: SchufaCategory[] = ["insolvency", "negative", "accounts", "inquiries", "address", "personal"]
  const actions = order
    .filter((category) => present.includes(category))
    .map((category) => ACTIONS[category])

  return {
    entries: parsed.entries,
    unreadable: parsed.unreadable,
    empty: parsed.empty,
    present,
    actions,
    notes: BASE_NOTES,
    packVersion: SCHUFA_PACK_VERSION,
    disclaimer: SCHUFA_DISCLAIMER,
  }
}

/** One-line summary of how many entries per category, for the plan header. */
export function countByCategory(entries: readonly SchufaEntry[]): Record<SchufaCategory, number> {
  const counts = Object.fromEntries(SCHUFA_CATEGORIES.map((category) => [category, 0])) as Record<SchufaCategory, number>
  for (const entry of entries) counts[entry.category] += 1
  return counts
}

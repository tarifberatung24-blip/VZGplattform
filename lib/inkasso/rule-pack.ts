/**
 * Inkasso-Check rule pack.
 *
 * Deterministic assessment of a German payment claim (Mahnbescheid, Inkasso
 * letter, utility dispute). This is deliberately a pure function of the facts:
 * no model is consulted, because the legal assessment has to be reproducible
 * and auditable. `pack_version` travels with every evaluation so a later
 * correction to a rule can be traced.
 *
 * The output is structured initial information, not legal advice. See
 * DISCLAIMER — it must be shown with every result.
 */

export type Assessment = "unfounded" | "disputable" | "reducible" | "due"
export type DeadlineStatus = "open" | "critical" | "expired" | "unknown"
export type Risk = "high" | "medium" | "low"
export type Action = "WIDERSPRUCH" | "ABTRETUNGSNACHWEIS" | "VERGLEICH" | "SCHUFA_UNTERLASSUNG"

export const PACK_VERSION = "1.0.0"

/** § 247 BGB, reviewed 2026-01-01. Must be re-checked when the base rate moves. */
export const BASISZINSSATZ_PCT = 1.52

/** § 288 Abs. 1 BGB: five points above the base rate, consumer side. */
export const VERZUG_ZUSCHLAG_PCT = 5

/** Eingangsbestätigung of the Mahnbescheid starts the clock; § 694 ZPO gives two weeks. */
export const WIDERSPRUCH_DAYS = 14

/** Nr. 2300 VV RVG: 1.3 for a titulated claim drops to 0.65 otherwise. */
export const INKASSO_REDUKTION = 0.5

export const DISCLAIMER =
  "Това е структурирана предварителна проверка, а не правна консултация. " +
  "HORIZON не заменя адвокат. Препоръчваме преглед от Rechtsanwalt — при ниски " +
  "доходи чрез Beratungshilfe. / Dies ist eine strukturierte Ersteinschätzung und " +
  "keine Rechtsberatung. HORIZON ersetzt keinen Rechtsanwalt. Bei geringem Einkommen " +
  "ist Beratungshilfe möglich."

export interface Claim {
  hauptforderung: number
  verfahrenskosten: number
  inkassokosten: number
  zinsen: number
  total: number
  currency: "EUR"
}

export interface Dates {
  mahnbescheid: string | null
  service_date: string | null
  widerspruch_deadline: string | null
}

export interface Evidence {
  supplier: string
  meter_no: string
  period: string
  consumption_kwh: number
  amount: number
  parallel_billing: boolean
  data_exchange_delay_admitted: boolean
}

export interface Position {
  rule: string
  label: string
  basis: string
  assessment: Assessment
  amount: number
  recommendation: string
}

export interface Evaluation {
  risk: Risk
  deadline_status: DeadlineStatus
  positions: Position[]
  reducible_total: number
  actions: Action[]
  basiszinssatz_pct: number
  pack_version: string
  disclaimer: string
}

export interface RulePackInput {
  claim: Claim
  dates: Dates
  evidence: Evidence
  /** True once the creditor has produced the Abtretungsurkunde (§ 410 BGB). */
  abtretung_proven?: boolean
  /** Whether a Vollstreckungsbescheid / title exists; changes R4 and R6. */
  titulated?: boolean
  /** Year the claim arose, used by R6 when the period is not machine-readable. */
  accrual_year?: number | null
  /** Injectable so tests do not depend on the wall clock. */
  now?: Date
}

const round = (n: number) => Math.round(n * 100) / 100
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86_400_000)

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** R1 — § 694 ZPO. The two-week clock runs from service of the Mahnbescheid. */
export function deadlineFor(serviceDate: string | null, now = new Date()): {
  status: DeadlineStatus
  deadline: string | null
  daysLeft: number | null
} {
  const served = parseDate(serviceDate)
  if (!served) return { status: "unknown", deadline: null, daysLeft: null }
  const deadline = new Date(served)
  deadline.setDate(deadline.getDate() + WIDERSPRUCH_DAYS)
  const daysLeft = daysBetween(now, deadline)
  const status: DeadlineStatus =
    daysLeft < 0 ? "expired" : daysLeft <= 3 ? "critical" : "open"
  return { status, deadline: deadline.toISOString().slice(0, 10), daysLeft }
}

function evaluateDeadline(input: RulePackInput, positions: Position[], actions: Set<Action>) {
  const computed = deadlineFor(input.dates.service_date, input.now ?? new Date())
  const status = computed.status

  let recommendation: string
  let assessment: Assessment
  if (status === "expired") {
    assessment = "disputable"
    recommendation =
      "Срокът е изтекъл — възражение по § 694 Abs. 2 ZPO и искане за Wiedereinsetzung по § 233 ZPO."
  } else if (status === "unknown") {
    assessment = "disputable"
    recommendation =
      "Датата на връчване липсва. Провери плика/датата — срокът тече от връчването."
  } else {
    assessment = "due"
    recommendation =
      status === "critical"
        ? "Срокът изтича до 3 дни. Изпрати възражението незабавно."
        : "Възражението трябва да е при съда в рамките на 2 седмици."
  }

  positions.push({
    rule: "R1",
    label: "Срок за възражение",
    basis: "§ 694 ZPO",
    assessment,
    amount: 0,
    recommendation,
  })
  actions.add("WIDERSPRUCH")
  return { status, deadline: computed.deadline, daysLeft: computed.daysLeft }
}

/** R2 — the accessory amounts must add up to the stated total. */
function evaluateDecomposition(claim: Claim, positions: Position[]) {
  const sum =
    claim.hauptforderung + claim.verfahrenskosten + claim.inkassokosten + claim.zinsen
  const consistent = Math.abs(sum - claim.total) <= 0.01
  positions.push({
    rule: "R2",
    label: "Разлагане на вземането",
    basis: "§ 253 ZPO (Antrag)",
    assessment: consistent ? "due" : "disputable",
    amount: 0,
    recommendation: consistent
      ? "Сумите са съгласувани със заявения общ размер."
      : `Сумата на позициите (${round(sum)} €) не съвпада със заявения общ размер (${round(claim.total)} €).`,
  })
  return consistent
}

/**
 * R3 — § 288 Abs. 1 BGB. A consumer owes five points over the base rate. The
 * claimed interest is measured against that ceiling; § 288 Abs. 5 (the 40 €
 * flat fee) is a merchant provision and is not owed in B2C.
 */
function evaluateInterest(claim: Claim, positions: Position[], noVerzug: boolean) {
  if (claim.zinsen <= 0) return 0
  if (noVerzug) {
    positions.push({
      rule: "R3",
      label: "Лихви за забава",
      basis: "§ 288 Abs. 1 BGB; § 286 Abs. 4 BGB",
      assessment: "disputable",
      amount: claim.zinsen,
      recommendation:
        "Няма забава в сферата на длъжника, значи лихвите за забава не се дължат изцяло.",
    })
    return claim.zinsen
  }
  const maxRate = BASISZINSSATZ_PCT + VERZUG_ZUSCHLAG_PCT
  const ceiling = round((claim.hauptforderung * maxRate) / 100)
  if (claim.zinsen <= ceiling) {
    positions.push({
      rule: "R3",
      label: "Лихви за забава",
      basis: "§ 288 Abs. 1 BGB",
      assessment: "due",
      amount: 0,
      recommendation: `Лихвите са в рамките на законния максимум (${maxRate}%).`,
    })
    return 0
  }
  const excess = round(claim.zinsen - ceiling)
  positions.push({
    rule: "R3",
    label: "Лихви за забава",
    basis: "§ 288 Abs. 1 BGB",
    assessment: "reducible",
    amount: excess,
    recommendation: `Лихвите надвишават законния размер ${maxRate}% с ${excess} €.`,
  })
  return excess
}

/**
 * R4 — § 13e Abs. 1 RDG; BGH VII ZR 81/21. On a claim that has not been reduced
 * to a title, the 1.3 Geschäftsgebühr is halved to 0.65 (Nr. 2300 VV RVG).
 */
function evaluateInkassoFee(input: RulePackInput, positions: Position[], noVerzug: boolean) {
  const fee = input.claim.inkassokosten
  if (fee <= 0) return 0
  if (noVerzug) {
    positions.push({
      rule: "R4",
      label: "Инкасо такса",
      basis: "§ 13e Abs. 1 RDG; BGH VII ZR 81/21",
      assessment: "disputable",
      amount: fee,
      recommendation:
        "Без забава няма основание за инкасо такса; при липса на доказване не се дължи.",
    })
    return fee
  }
  if (input.titulated) {
    positions.push({
      rule: "R4",
      label: "Инкасо такса",
      basis: "§ 13e Abs. 1 RDG",
      assessment: "due",
      amount: 0,
      recommendation: "При титулирано вземане таксата следва RVG и е дължима.",
    })
    return 0
  }
  const reducible = round(fee * INKASSO_REDUKTION)
  positions.push({
    rule: "R4",
    label: "Инкасо такса",
    basis: "§ 13e Abs. 1 RDG; Nr. 2300 VV RVG; BGH VII ZR 81/21",
    assessment: "reducible",
    amount: reducible,
    recommendation:
      "Нетитолирано вземане: 1,3 Geschäftsgebühr се редуцира на 0,65 — половината е оспорима.",
  })
  return reducible
}

/**
 * R5 — § 286, § 280 BGB; BGH VIII ZR 95/18. Only real, necessary disbursements
 * are recoverable. Fixed AGB fees (5/6 €) are usually invalid (§ 309 Nr. 5 BGB),
 * and Mahnkosten must not be claimed in parallel with Inkassokosten.
 */
function evaluateFees(
  input: RulePackInput,
  positions: Position[],
  noVerzug: boolean,
  decompositionOk: boolean,
) {
  const fees = input.claim.verfahrenskosten
  if (fees <= 0) return 0
  if (noVerzug) {
    positions.push({
      rule: "R5",
      label: "Разноски и такси за напомняне",
      basis: "§ 286, § 280 BGB; BGH VIII ZR 95/18",
      assessment: "disputable",
      amount: fees,
      recommendation:
        "Разноските предполагат забава. Без забава те не се дължат; искай разбивка на реалните разходи.",
    })
    return fees
  }
  if (!decompositionOk) {
    positions.push({
      rule: "R5",
      label: "Разноски и такси за напомняне",
      basis: "§ 286, § 280 BGB; § 309 Nr. 5 BGB",
      assessment: "disputable",
      amount: fees,
      recommendation:
        "Разбивката не е съгласувана — фиксирани AGB такси и Mahnkosten успоредно с Inkassokosten често са недействителни.",
    })
    return fees
  }
  positions.push({
    rule: "R5",
    label: "Разноски и такси за напомняне",
    basis: "§ 286, § 280 BGB; BGH VIII ZR 95/18",
    assessment: "due",
    amount: 0,
    recommendation: "Само реални, необходими разходи са възстановими — поискай доказателства.",
  })
  return 0
}

/** R6 — §§ 195, 199 BGB. Three years from the end of the year the claim arose. */
function evaluatePrescription(input: RulePackInput, positions: Position[]) {
  const year =
    input.accrual_year ?? Number((input.evidence.period || "").match(/\b(20\d{2})\b/)?.[1])
  const now = input.now ?? new Date()
  if (!year || Number.isNaN(year)) {
    positions.push({
      rule: "R6",
      label: "Давност",
      basis: "§§ 195, 199 BGB",
      assessment: "disputable",
      amount: 0,
      recommendation: "Годината на възникване липсва — давността не може да се прецени.",
    })
    return false
  }
  const prescribesEndOf = year + 3
  const expired = now.getFullYear() > prescribesEndOf
  positions.push({
    rule: "R6",
    label: "Давност",
    basis: "§§ 195, 199, 212 BGB",
    assessment: expired ? "unfounded" : "due",
    amount: 0,
    recommendation: expired
      ? `Вземането от ${year} г. се погасява на 31.12.${prescribesEndOf} — вероятно е погасено по давност.`
      : `Давността изтича на 31.12.${prescribesEndOf}. Провери дали няма прекъсване по § 212 BGB.`,
  })
  return expired
}

/** R7 — § 404, § 812 BGB. A parallel supplier for the same address and period. */
function evaluateDoubleBilling(ev: Evidence, positions: Position[], actions: Set<Action>) {
  if (!ev.parallel_billing) return
  positions.push({
    rule: "R7",
    label: "Двойно фактуриране / паралелен доставчик",
    basis: "§ 404, § 812 BGB",
    assessment: "disputable",
    amount: 0,
    recommendation:
      "Доказан е друг реален доставчик за същия адрес и период. Възраженията срещу стария кредитор се противопоставят на новия (§ 404 BGB).",
  })
  actions.add("WIDERSPRUCH")
  actions.add("ABTRETUNGSNACHWEIS")
}

/** R8 — § 20a EnWG. An admitted data-exchange failure shifts the burden of proof. */
function evaluateDataExchange(ev: Evidence, positions: Position[], actions: Set<Action>) {
  if (!ev.data_exchange_delay_admitted) return false
  positions.push({
    rule: "R8",
    label: "Срив в обмена на данни",
    basis: "§ 20a EnWG; GPKE",
    assessment: "disputable",
    amount: 0,
    recommendation:
      "Признат срив в обмена на данни обръща тежестта на доказване към доставчика — фактурирането е оспоримо.",
  })
  actions.add("WIDERSPRUCH")
  return true
}

/** R9 — § 410 BGB; § 13a RDG. Refuse performance until the assignment is proven. */
function evaluateAssignment(
  input: RulePackInput,
  positions: Position[],
  actions: Set<Action>,
) {
  if (input.abtretung_proven) return
  positions.push({
    rule: "R9",
    label: "Удостоверение за прехвърляне",
    basis: "§ 410 BGB; § 13a RDG",
    assessment: "disputable",
    amount: 0,
    recommendation:
      "Плащане само срещу Abtretungsurkunde. Дотогава имаш право да откажеш плащане.",
  })
  actions.add("ABTRETUNGSNACHWEIS")
}

/** R10 — § 31 Abs. 2 BDSG; OLG Schleswig 17 U 2/24. No Schufa entry for a disputed claim. */
function evaluateSchufa(positions: Position[], actions: Set<Action>, disputed: boolean) {
  if (!disputed) return
  positions.push({
    rule: "R10",
    label: "Забрана за Schufa",
    basis: "§ 31 Abs. 2 BDSG; OLG Schleswig 17 U 2/24",
    assessment: "disputable",
    amount: 0,
    recommendation:
      "Оспорено и нетитолирано вземане не е годна кредитна информация. Искай преустановяване на вписването.",
  })
  actions.add("SCHUFA_UNTERLASSUNG")
}

/**
 * R11 — § 286 Abs. 4, § 254 BGB. Where the delay lies outside the debtor's
 * sphere there is no default at all, so interest and default damages fall away.
 */
function evaluateNoDefault(input: RulePackInput, positions: Position[], actions: Set<Action>) {
  const outsideSphere =
    input.evidence.data_exchange_delay_admitted || input.evidence.parallel_billing
  if (!outsideSphere) return false
  positions.push({
    rule: "R11",
    label: "Без вина → без забава",
    basis: "§ 286 Abs. 4 BGB; § 254 BGB",
    assessment: "disputable",
    amount: 0,
    recommendation:
      "Забавянето е извън сферата на длъжника, значи няма Verzug — лихвите и вредите от забава отпадат.",
  })
  actions.add("WIDERSPRUCH")
  return true
}

export function evaluate(input: RulePackInput): Evaluation {
  const positions: Position[] = []
  const actions = new Set<Action>()

  const deadline = evaluateDeadline(input, positions, actions)
  const decompositionOk = evaluateDecomposition(input.claim, positions)
  const dataDelay = evaluateDataExchange(input.evidence, positions, actions)
  const noVerzug = evaluateNoDefault(input, positions, actions) || dataDelay

  evaluateDoubleBilling(input.evidence, positions, actions)

  const interest = evaluateInterest(input.claim, positions, noVerzug)
  const inkasso = evaluateInkassoFee(input, positions, noVerzug)
  const fees = evaluateFees(input, positions, noVerzug, decompositionOk)

  const prescribed = evaluatePrescription(input, positions)

  evaluateAssignment(input, positions, actions)

  const reducibleTotal = round(interest + inkasso + fees)
  const disputed = reducibleTotal > 0 || prescribed || dataDelay
  evaluateSchufa(positions, actions, disputed)

  if (reducibleTotal > 0) actions.add("VERGLEICH")

  const ratio = input.claim.total > 0 ? reducibleTotal / input.claim.total : 0
  const risk: Risk =
    deadline.status === "critical" ||
    deadline.status === "expired" ||
    ratio > 0.3 ||
    dataDelay ||
    input.evidence.parallel_billing
      ? "high"
      : ratio >= 0.1
        ? "medium"
        : "low"

  return {
    risk,
    deadline_status: deadline.status,
    positions,
    reducible_total: reducibleTotal,
    actions: [...actions],
    basiszinssatz_pct: BASISZINSSATZ_PCT,
    pack_version: PACK_VERSION,
    disclaimer: DISCLAIMER,
  }
}

import {
  MAX_ACTIONS_PER_HORIZON,
  type BusinessDiagnosisContent,
  type EvidenceClass,
  type PlaybookHorizon,
  type PlaybookPriority,
} from "./contract"

/**
 * HORIZON Business Consultant — deterministic 30/60/90-day playbook.
 *
 * The plan is built from the diagnosis by rules, not by a model. That is a
 * deliberate choice: an action plan a user is asked to execute must be
 * reproducible from the same inputs, and a model must not be the source of a
 * deadline or a priority. The diagnosis decides *what* is wrong; this module
 * decides *which concrete step follows*, deterministically.
 *
 * Every action carries the evidence class of the finding that produced it, so a
 * step derived from an AI assumption is visibly an assumption, not an order.
 */

export type ProposedAction = {
  horizon: PlaybookHorizon
  actionKey: string
  title: { bg: string; de: string }
  description: { bg: string; de: string }
  priority: PlaybookPriority
  effort: PlaybookPriority
  expectedBenefit: { bg: string; de: string }
  requiredDocuments: string[]
  dependencies: string[]
  responsible: "user" | "horizon" | "partner"
  approvalRequired: boolean
  evidenceClass: EvidenceClass
}

/** How a diagnosis section maps onto a horizon and a concrete step. */
type Rule = {
  section: BusinessDiagnosisContent["findings"][number]["section"]
  horizon: PlaybookHorizon
  actionKey: string
  title: { bg: string; de: string }
  description: { bg: string; de: string }
  priority: PlaybookPriority
  effort: PlaybookPriority
  expectedBenefit: { bg: string; de: string }
  requiredDocuments: string[]
  dependencies: string[]
  responsible: "user" | "horizon" | "partner"
  approvalRequired: boolean
}

/**
 * The rule set. One rule per actionable diagnosis section. `overview` has no
 * rule: a summary is not a task. `missing_information` and `risks` produce
 * consolidation steps, because acting on an incomplete picture is the risk.
 */
export const PLAYBOOK_RULES: readonly Rule[] = [
  {
    section: "missing_information",
    horizon: 30,
    actionKey: "collect-missing-information",
    title: { bg: "Събери липсващата информация", de: "Fehlende Informationen zusammentragen" },
    description: {
      bg: "Списък с документите и данните, които липсват, за да е пълна картината.",
      de: "Liste der fehlenden Unterlagen und Angaben, damit das Bild vollständig ist.",
    },
    priority: "high",
    effort: "low",
    expectedBenefit: { bg: "Пълна основа за следващите стъпки", de: "Vollständige Grundlage für die nächsten Schritte" },
    requiredDocuments: ["Gewerbeanmeldung", "Steuerliche Unterlagen"],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "administrative_inefficiencies",
    horizon: 30,
    actionKey: "organise-administration",
    title: { bg: "Подреди администрацията", de: "Verwaltung ordnen" },
    description: {
      bg: "Едно място за документи, срокове и задачи, за да не се губи нищо.",
      de: "Ein Ort für Unterlagen, Fristen und Aufgaben, damit nichts verloren geht.",
    },
    priority: "high",
    effort: "medium",
    expectedBenefit: { bg: "По-малко пропуснати срокове", de: "Weniger verpasste Fristen" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "cost_opportunities",
    horizon: 30,
    actionKey: "review-recurring-costs",
    title: { bg: "Прегледай постоянните разходи", de: "Wiederkehrende Kosten prüfen" },
    description: {
      bg: "Преглед на редовните разходи и договори с дата за прекратяване.",
      de: "Überblick über laufende Kosten und Verträge mit Kündigungsdatum.",
    },
    priority: "high",
    effort: "medium",
    expectedBenefit: { bg: "Възможност за намаляване на разходи", de: "Mögliche Kostensenkung" },
    requiredDocuments: ["Verträge", "Rechnungen"],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "weaknesses",
    horizon: 30,
    actionKey: "address-core-weakness",
    title: { bg: "Адресирай основната слабост", de: "Kernschwäche angehen" },
    description: {
      bg: "Конкретна стъпка по най-важната установена слабост.",
      de: "Ein konkreter Schritt zur wichtigsten festgestellten Schwäche.",
    },
    priority: "medium",
    effort: "medium",
    expectedBenefit: { bg: "Стабилна основа на дейността", de: "Stabilere Grundlage des Betriebs" },
    requiredDocuments: [],
    dependencies: ["collect-missing-information"],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "bottlenecks",
    horizon: 60,
    actionKey: "remove-bottleneck",
    title: { bg: "Премахни тясното място", de: "Engpass beseitigen" },
    description: {
      bg: "Процес, който спира работата, се опростява или автоматизира.",
      de: "Ein Prozess, der die Arbeit aufhält, wird vereinfacht oder automatisiert.",
    },
    priority: "high",
    effort: "medium",
    expectedBenefit: { bg: "По-бърза ежедневна работа", de: "Schnellerer Arbeitsalltag" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "digitalization",
    horizon: 60,
    actionKey: "digitise-process",
    title: { bg: "Дигитализирай процес", de: "Einen Prozess digitalisieren" },
    description: {
      bg: "Въвеждане на инструмент за фактуриране, документи или задачи.",
      de: "Einführung eines Werkzeugs für Rechnungen, Unterlagen oder Aufgaben.",
    },
    priority: "medium",
    effort: "high",
    expectedBenefit: { bg: "По-малко ръчна работа", de: "Weniger manuelle Arbeit" },
    requiredDocuments: [],
    dependencies: ["organise-administration"],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "risks",
    horizon: 60,
    actionKey: "mitigate-identified-risk",
    title: { bg: "Намали установения риск", de: "Festgestelltes Risiko mindern" },
    description: {
      bg: "Мерки по установените рискове, включително преглед от квалифициран специалист.",
      de: "Maßnahmen zu den festgestellten Risiken, einschließlich Prüfung durch eine qualifizierte Stelle.",
    },
    priority: "high",
    effort: "medium",
    expectedBenefit: { bg: "Намален риск", de: "Geringeres Risiko" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "partner",
    approvalRequired: true,
  },
  {
    section: "revenue_opportunities",
    horizon: 90,
    actionKey: "pursue-revenue-opportunity",
    title: { bg: "Развий възможност за приходи", de: "Umsatzchance verfolgen" },
    description: {
      bg: "Конкретна стъпка към нова или по-добре платена услуга.",
      de: "Ein konkreter Schritt zu einer neuen oder besser bezahlten Leistung.",
    },
    priority: "medium",
    effort: "high",
    expectedBenefit: { bg: "Повече приходи", de: "Mehr Umsatz" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "strengths",
    horizon: 90,
    actionKey: "build-on-strength",
    title: { bg: "Надгради върху силната страна", de: "Auf Stärke aufbauen" },
    description: {
      bg: "Използвай установената силна страна като основа за растеж.",
      de: "Die festgestellte Stärke als Grundlage für Wachstum nutzen.",
    },
    priority: "low",
    effort: "medium",
    expectedBenefit: { bg: "Устойчив растеж", de: "Nachhaltiges Wachstum" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
  {
    section: "recommendations",
    horizon: 90,
    actionKey: "evaluate-kpis",
    title: { bg: "Оцени показателите", de: "Kennzahlen auswerten" },
    description: {
      bg: "Преглед на напредъка спрямо целите и настройка на плана.",
      de: "Überblick über den Fortschritt gegenüber den Zielen und Anpassung des Plans.",
    },
    priority: "medium",
    effort: "low",
    expectedBenefit: { bg: "Ясна посока", de: "Klare Richtung" },
    requiredDocuments: [],
    dependencies: [],
    responsible: "user",
    approvalRequired: false,
  },
]

/**
 * Builds the plan. Only rules whose section actually appears in the diagnosis
 * become actions, so a plan never contains a step the evidence did not justify.
 * The evidence class of the first finding for a section is carried onto the
 * action; a section with only `ai_assumption` findings yields an assumption-marked
 * action, never a "verified" one.
 */
export function buildPlaybook(diagnosis: BusinessDiagnosisContent): ProposedAction[] {
  const bySection = new Map<string, EvidenceClass>()
  for (const finding of diagnosis.findings) {
    if (!bySection.has(finding.section)) bySection.set(finding.section, finding.evidenceClass)
  }

  const actions: ProposedAction[] = []
  const perHorizon = new Map<PlaybookHorizon, number>()

  for (const rule of PLAYBOOK_RULES) {
    const evidenceClass = bySection.get(rule.section)
    if (!evidenceClass) continue
    const count = perHorizon.get(rule.horizon) ?? 0
    if (count >= MAX_ACTIONS_PER_HORIZON) continue
    perHorizon.set(rule.horizon, count + 1)
    actions.push({
      horizon: rule.horizon,
      actionKey: rule.actionKey,
      title: rule.title,
      description: rule.description,
      priority: rule.priority,
      effort: rule.effort,
      expectedBenefit: rule.expectedBenefit,
      requiredDocuments: [...rule.requiredDocuments],
      dependencies: [...rule.dependencies],
      responsible: rule.responsible,
      approvalRequired: rule.approvalRequired,
      evidenceClass,
    })
  }

  return actions
}

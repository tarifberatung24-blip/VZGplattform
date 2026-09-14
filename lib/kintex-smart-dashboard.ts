export type SmartDashboardModuleStatus = "active" | "next" | "planned"
export type SmartDashboardDataSource = "profiles" | "contracts" | "documents" | "reminders" | "audit_events" | "storage.objects"

export type SmartDashboardStats = {
  contracts: number
  documents: number
  profileCompleteness: number
  documentsNeedingReview?: number
  contractsNeedingInfo?: number
}

export const smartDashboardEnvironment = {
  appName: "KintexBG",
  brandLine: "BY VZG CONSULT",
  primaryLocale: "bg",
  secondaryLocale: "de",
  market: "Bulgarian-speaking users living in Germany",
  frontend: "Next.js App Router",
  auth: "Supabase Auth",
  database: "Supabase Postgres",
  storage: "Supabase Storage",
  aiLayer: "AI explanation layer after manual offer preparation",
  automationLayer: "n8n manual offer workflows",
  deployment: "Vercel",
  designSystem: "NovaMind institutional finance UI",
} as const

export const smartDashboardRules = {
  noMockFinancialData: true,
  noFakeTariffOffers: true,
  householdScopedData: true,
  userConfirmationRequired: true,
  noExternalActionWithoutApproval: true,
  noServiceRoleInClient: true,
  auditEveryAutomationAction: true,
  noAutomatedDecisionMaking: true,
} as const

export const smartDashboardModules = [
  { id: "overview", labelBg: "Преглед", labelDe: "Übersicht", status: "active", dataSources: ["profiles", "contracts", "documents", "reminders"] },
  { id: "contracts", labelBg: "Договори", labelDe: "Verträge", status: "active", dataSources: ["contracts", "documents"] },
  { id: "documents", labelBg: "Документи", labelDe: "Dokumente", status: "active", dataSources: ["documents", "storage.objects", "audit_events"] },
  { id: "kintex-radar", labelBg: "Kintex Radar", labelDe: "Kintex Radar", status: "next", dataSources: ["profiles", "contracts", "documents", "reminders", "audit_events"] },
  { id: "offer-desk", labelBg: "Офертен desk", labelDe: "Angebotsdesk", status: "active", dataSources: ["documents", "contracts", "audit_events"] },
  { id: "deadlines", labelBg: "Срокове", labelDe: "Fristen", status: "planned", dataSources: ["reminders", "contracts", "documents"] },
  { id: "opportunities", labelBg: "Възможности", labelDe: "Möglichkeiten", status: "planned", dataSources: ["contracts", "profiles"] },
] as const satisfies ReadonlyArray<{
  id: string
  labelBg: string
  labelDe: string
  status: SmartDashboardModuleStatus
  dataSources: readonly SmartDashboardDataSource[]
}>

export const smartDashboardAgents = [
  { id: "intake-agent", stage: "1", title: "Document Intake Agent", status: "ACTIVE", output: "Upload, validation, household-scoped storage" },
  { id: "workflow-router", stage: "2", title: "n8n Intake Workflow", status: "ACTIVE", output: "Route offer requests to manual processing" },
  { id: "review-agent", stage: "3", title: "Manual Review Desk", status: "ACTIVE", output: "Human confirmation before offers become trusted" },
  { id: "radar-agent", stage: "4", title: "Radar Orchestrator", status: "NEXT", output: "Rank contracts, documents, deadlines, claims" },
  { id: "workflow-agent", stage: "5", title: "Connector Layer", status: "PLANNED", output: "Gmail, Telegram, Calendar, GitHub/Vercel workflows after approval" },
] as const

export function getSmartDashboardNextAction(stats: SmartDashboardStats, locale: "bg" | "de") {
  const de = locale === "de"
  if ((stats.documentsNeedingReview ?? 0) > 0) return { id: "document_review", href: "/documents", label: de ? "Dokumente prüfen" : "Провери чакащите документи", reason: "DOCUMENTS_NEED_REVIEW" }
  if ((stats.contractsNeedingInfo ?? 0) > 0) return { id: "contract_info", href: "/vertraege", label: de ? "Vertragsdaten ergänzen" : "Допълни данните по договор", reason: "CONTRACTS_NEED_INFO" }
  if (stats.profileCompleteness < 60) return { id: "profile", href: "/profil", label: de ? "Profil vervollständigen" : "Попълни профила", reason: "PROFILE_INCOMPLETE" }
  if (stats.contracts === 0) return { id: "contracts", href: "/vertraege", label: de ? "Verträge erfassen" : "Добави договори", reason: "NO_CONTRACTS" }
  if (stats.documents === 0) return { id: "documents", href: "/documents", label: de ? "Dokumente hochladen" : "Качи документи", reason: "NO_DOCUMENTS" }
  return { id: "offer_request", href: "/zayavka", label: de ? "Angebot anfragen" : "Заяви оферта", reason: "READY_FOR_MANUAL_OFFER_REQUEST" }
}

export function getSmartDashboardProblems(stats: SmartDashboardStats) {
  const problems: Array<{ code: string; severity: "info" | "warning"; module: string }> = []
  if (stats.profileCompleteness < 60) problems.push({ code: "PROFILE_INCOMPLETE", severity: "warning", module: "profile" })
  if (stats.contracts === 0) problems.push({ code: "NO_CONTRACTS", severity: "warning", module: "contracts" })
  if (stats.documents === 0) problems.push({ code: "NO_DOCUMENTS", severity: "info", module: "documents" })
  return problems
}

export type SmartDashboardModuleStatus = "active" | "next" | "planned"
export type SmartDashboardDataSource = "profiles" | "contracts" | "documents" | "reminders" | "audit_events" | "storage.objects"

export type SmartDashboardStats = {
  contracts: number
  documents: number
  profileCompleteness: number
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
  aiLayer: "Vercel AI SDK",
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
  auditEveryAiAction: true,
  aiSuggestsButDoesNotDecide: true,
} as const

export const smartDashboardModules = [
  { id: "overview", labelBg: "Преглед", labelDe: "Übersicht", status: "active", dataSources: ["profiles", "contracts", "documents", "reminders"] },
  { id: "contracts", labelBg: "Договори", labelDe: "Verträge", status: "active", dataSources: ["contracts", "documents"] },
  { id: "documents", labelBg: "Документи", labelDe: "Dokumente", status: "active", dataSources: ["documents", "storage.objects", "audit_events"] },
  { id: "kintex-radar", labelBg: "Kintex Radar", labelDe: "Kintex Radar", status: "next", dataSources: ["profiles", "contracts", "documents", "reminders", "audit_events"] },
  { id: "ai-home-office", labelBg: "AI Home Office Assistant", labelDe: "AI Home Office Assistant", status: "active", dataSources: ["documents", "contracts", "audit_events"] },
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
  { id: "analysis-agent", stage: "2", title: "Analysis Agent", status: "ACTIVE", output: "Extract facts, risks, missing info, next steps" },
  { id: "review-agent", stage: "3", title: "Review Agent", status: "ACTIVE", output: "Human confirmation before facts become trusted" },
  { id: "radar-agent", stage: "4", title: "Radar Orchestrator", status: "NEXT", output: "Rank contracts, documents, deadlines, claims" },
  { id: "workflow-agent", stage: "5", title: "Connector Layer", status: "PLANNED", output: "Gmail, Telegram, Calendar, GitHub/Vercel workflows after approval" },
] as const

export function getSmartDashboardNextAction(stats: SmartDashboardStats, locale: "bg" | "de") {
  const de = locale === "de"
  if (stats.profileCompleteness < 60) return { id: "profile", href: "/profil", label: de ? "Profil vervollständigen" : "Попълни профила", reason: "PROFILE_INCOMPLETE" }
  if (stats.contracts === 0) return { id: "contracts", href: "/vertraege", label: de ? "Verträge erfassen" : "Добави договори", reason: "NO_CONTRACTS" }
  if (stats.documents === 0) return { id: "documents", href: "/documents", label: de ? "Dokumente hochladen" : "Качи документи", reason: "NO_DOCUMENTS" }
  return { id: "assistant", href: "/protected/home-office", label: de ? "AI Prüfung starten" : "Стартирай AI проверка", reason: "READY_FOR_AI_REVIEW" }
}

export function getSmartDashboardProblems(stats: SmartDashboardStats) {
  const problems: Array<{ code: string; severity: "info" | "warning"; module: string }> = []
  if (stats.profileCompleteness < 60) problems.push({ code: "PROFILE_INCOMPLETE", severity: "warning", module: "profile" })
  if (stats.contracts === 0) problems.push({ code: "NO_CONTRACTS", severity: "warning", module: "contracts" })
  if (stats.documents === 0) problems.push({ code: "NO_DOCUMENTS", severity: "info", module: "documents" })
  return problems
}

import type { CaseIntent } from "@/lib/office/supabase/database"
import type { GuideIntent } from "@/lib/horizon/guide/intents"

/**
 * The five HORIZON entry modules shown on the home screen, in the order the
 * master map defines. Each is a real case module backed by the shared engine.
 */
export const HORIZON_HOME_MODULES = [
  "agentur_fuer_arbeit",
  "jobcenter",
  "kuendigung",
  "steuererklaerung",
  "unterlagen_erklaeren",
] as const

export type HorizonHomeModule = (typeof HORIZON_HOME_MODULES)[number]

export function isHorizonHomeModule(value: unknown): value is HorizonHomeModule {
  return typeof value === "string" && (HORIZON_HOME_MODULES as readonly string[]).includes(value)
}

/** Label key within `horizon.modules.*`. */
export const homeModuleKey: Record<HorizonHomeModule, string> = {
  agentur_fuer_arbeit: "agenturFuerArbeit",
  jobcenter: "jobcenter",
  kuendigung: "kuendigung",
  steuererklaerung: "steuererklaerung",
  unterlagen_erklaeren: "unterlagenErklaeren",
}

export const homeModuleIcon: Record<HorizonHomeModule, string> = {
  agentur_fuer_arbeit: "Building2",
  jobcenter: "Briefcase",
  kuendigung: "FileX2",
  steuererklaerung: "Receipt",
  unterlagen_erklaeren: "FileSearch",
}

/**
 * German case titles. Stored on `cases.title`, so they must not depend on the
 * viewer's UI language: the same case presented to an authority stays German.
 */
export const homeModuleCaseTitle: Record<HorizonHomeModule, string> = {
  agentur_fuer_arbeit: "Anliegen bei der Agentur für Arbeit",
  jobcenter: "Anliegen beim Jobcenter",
  kuendigung: "Vertrag kündigen",
  steuererklaerung: "Steuererklärung",
  unterlagen_erklaeren: "Dokument verstehen",
}

/**
 * Legacy `cases.intent` per module. Must stay within the CHECK vocabulary; the
 * `CaseIntent` type turns an out-of-vocabulary value into a compile error.
 */
export const homeModuleIntent: Record<HorizonHomeModule, CaseIntent> = {
  agentur_fuer_arbeit: "application",
  jobcenter: "application",
  kuendigung: "cancellation",
  steuererklaerung: "explanation",
  unterlagen_erklaeren: "explanation",
}

/**
 * The guide entry that best matches each module, used to offer the task-shaped
 * path alongside the departmental one. Modules without an equivalent guide
 * entry are absent rather than mapped to an unrelated intent.
 */
export const homeModuleGuideIntent: Partial<Record<HorizonHomeModule, GuideIntent>> = {
  kuendigung: "cancel_contract",
  unterlagen_erklaeren: "understand_document",
}

export type HomeModuleDefinition = {
  module: HorizonHomeModule
  caseTitle: string
  intent: CaseIntent
  guideIntent?: GuideIntent
}

export const homeModules: readonly HomeModuleDefinition[] = HORIZON_HOME_MODULES.map((module) => ({
  module,
  caseTitle: homeModuleCaseTitle[module],
  intent: homeModuleIntent[module],
  guideIntent: homeModuleGuideIntent[module],
}))

/**
 * Secondary destinations. Every `path` below is an existing page; nothing here
 * may point at a route that does not render.
 */
export const homeShortcuts = [
  { id: "cases", path: "/guide", labelBg: "Моите случаи", labelDe: "Meine Vorgänge" },
  { id: "documents", path: "/documents", labelBg: "Документи", labelDe: "Dokumente" },
  { id: "profile", path: "/profil", labelBg: "Профил", labelDe: "Profil" },
  { id: "security", path: "/protected/security", labelBg: "Сигурност", labelDe: "Sicherheit" },
] as const

export type HomeShortcutId = (typeof homeShortcuts)[number]["id"]

export function isHomeShortcutId(value: unknown): value is HomeShortcutId {
  return typeof value === "string" && homeShortcuts.some((item) => item.id === value)
}
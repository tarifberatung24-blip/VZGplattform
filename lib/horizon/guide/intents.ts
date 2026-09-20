import type { CaseIntent } from "@/lib/office/supabase/database"
import type { CaseModule } from "@/lib/horizon/case/contract"

/**
 * The five Horizon Guide entry points. These are task-shaped, not
 * department-shaped: a user who does not know which authority or form applies
 * still has exactly one obvious entry.
 */
export const GUIDE_INTENTS = [
  "understand_document",
  "reply_to_authority",
  "fill_official_form",
  "cancel_contract",
  "unsure",
] as const

export type GuideIntent = (typeof GUIDE_INTENTS)[number]

export const GUIDE_PATH = "/guide"

export function isGuideIntent(value: unknown): value is GuideIntent {
  return typeof value === "string" && (GUIDE_INTENTS as readonly string[]).includes(value)
}

/** Message-key suffixes within `guide.intents.*`, kept in sync with the catalogs. */
export const guideIntentKey: Record<GuideIntent, string> = {
  understand_document: "understandDocument",
  reply_to_authority: "replyToAuthority",
  fill_official_form: "fillOfficialForm",
  cancel_contract: "cancelContract",
  unsure: "unsure",
}

/**
 * Lucide icon name per intent, resolved to a component in the chooser. Kept as
 * a name rather than an import so this module stays server-safe: it is read by
 * the page and by the server action, neither of which should pull the icon set.
 */
export const guideIntentIcon: Record<GuideIntent, string> = {
  understand_document: "FileSearch",
  reply_to_authority: "Mail",
  fill_official_form: "ClipboardList",
  cancel_contract: "FileX2",
  unsure: "HelpCircle",
}

/**
 * Maps a guide intent to the module whose case flow it should open.
 *
 * `unsure` deliberately routes to `general`: the guide must never guess a
 * department for a user who has not said what they need. The case is created as
 * `general` and reclassified only once the user supplies facts that justify it.
 */
export const guideIntentModule: Record<GuideIntent, CaseModule> = {
  understand_document: "unterlagen_erklaeren",
  reply_to_authority: "general",
  fill_official_form: "general",
  cancel_contract: "kuendigung",
  unsure: "general",
}

/**
 * Case titles are stored in German because they describe official proceedings
 * and are shown to authorities. The user-facing translation lives in the
 * catalogs keyed by the same intent.
 */
export const guideIntentCaseTitle: Record<GuideIntent, string> = {
  understand_document: "Dokument verstehen",
  reply_to_authority: "Antwort an eine Behörde vorbereiten",
  fill_official_form: "Amtliches Formular ausfüllen",
  cancel_contract: "Vertrag kündigen",
  unsure: "Anliegen noch unklar",
}

/**
 * The intent persisted on `cases.intent`.
 *
 * This column is pre-existing and its CHECK constraint is lowercase
 * (`explanation, reply, complaint, application, objection, cancellation,
 * document_request, reminder, free_email`), so every mapping below must be one
 * of those literals. `CaseIntent` makes a typo or a new-but-unconstrained value
 * a compile error rather than a runtime insert failure.
 */
export const guideIntentLegacyIntent: Record<GuideIntent, CaseIntent> = {
  understand_document: "explanation",
  reply_to_authority: "reply",
  fill_official_form: "application",
  cancel_contract: "cancellation",
  unsure: "free_email",
}

export type GuideIntentDefinition = {
  intent: GuideIntent
  module: CaseModule
  caseTitle: string
  legacyIntent: CaseIntent
}

export const guideIntents: readonly GuideIntentDefinition[] = GUIDE_INTENTS.map((intent) => ({
  intent,
  module: guideIntentModule[intent],
  caseTitle: guideIntentCaseTitle[intent],
  legacyIntent: guideIntentLegacyIntent[intent],
}))

export function guideIntentDefinition(intent: GuideIntent): GuideIntentDefinition {
  return guideIntents.find((entry) => entry.intent === intent) as GuideIntentDefinition
}

/**
 * Whether a value is a legacy intent this codebase writes. Used to detect drift
 * between the constants here and the database CHECK constraint.
 */
export function isKnownLegacyIntent(value: unknown): boolean {
  return typeof value === "string" && guideIntents.some((entry) => entry.legacyIntent === value)
}

/** The destination a guide selection opens, preserving the active locale. */
export function guideCasePath(locale: string, caseId: string): string {
  return `/${locale}/guide/${caseId}`
}
import "server-only"

import { createCaseEngine } from "@/lib/horizon/case"
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/dictionaries"
import { isTextIntakeKind } from "./text"

export type TextIntakeState = {
  error: "missing_case" | "unknown_kind" | "empty" | "too_long" | "unauthorized" | "save_failed" | null
  ok: boolean
}

/**
 * Stable server-side implementation for text intake.
 *
 * Both the form action kept for backwards compatibility and the API endpoint
 * use this function. The browser therefore never needs to depend on a build-
 * specific Server Action id to save a case input.
 */
export async function saveTextIntake(input: {
  caseId: unknown
  locale: unknown
  kind: unknown
  text: unknown
}): Promise<TextIntakeState> {
  const locale: Locale =
    typeof input.locale === "string" && isLocale(input.locale) ? input.locale : defaultLocale

  if (typeof input.caseId !== "string" || input.caseId.length === 0) {
    return { error: "missing_case", ok: false }
  }
  if (!isTextIntakeKind(input.kind)) return { error: "unknown_kind", ok: false }
  if (typeof input.text !== "string") return { error: "empty", ok: false }

  const engine = await createCaseEngine()
  if (!engine.repository) return { error: "unauthorized", ok: false }

  const result = await engine.repository.addTextIntake(input.caseId, {
    text: input.text,
    kind: input.kind,
    locale,
  })

  // Repository failures can include provider details. They stay on the server;
  // the client only receives a stable, localizable failure code.
  if (result.error) {
    if (result.error.includes("Text intake rejected: empty")) return { error: "empty", ok: false }
    if (result.error.includes("Text intake rejected: too_long")) return { error: "too_long", ok: false }
    return { error: "save_failed", ok: false }
  }

  return { error: null, ok: true }
}

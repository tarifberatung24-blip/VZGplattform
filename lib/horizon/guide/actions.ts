"use server"

import { redirect } from "next/navigation"
import { createCaseEngine } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { TEXT_INTAKE_MAX_LENGTH } from "@/lib/horizon/intake/text"
import { localizedLoginPath } from "@/lib/supabase/auth-routing"
import {
  guideIntentDefinition,
  guideCasePath,
  isGuideIntent,
} from "./intents"

/**
 * Opens a canonical HORIZON case for a guide selection and sends the user to it.
 *
 * Every guide entry goes through the P5 case engine, so a selection produces a
 * real `public.cases` row rather than a dead-end link. Locale comes from the
 * caller, and the conversation locale matches the UI locale because the user is
 * understood in the language they chose; the authoritative output stays German.
 */
export async function startGuideCase(formData: FormData) {
  const rawIntent = formData.get("intent")
  const rawLocale = formData.get("locale")
  const locale: Locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (!isGuideIntent(rawIntent)) {
    redirect(`/${locale}/guide?error=unknown-intent`)
  }

  const engine = await createCaseEngine()
  if (!engine.repository) {
    redirect(localizedLoginPath(locale, `/${locale}/guide`))
  }

  const definition = guideIntentDefinition(rawIntent)
  const rawDescription = formData.get("description")
  const description = typeof rawDescription === "string" ? rawDescription : ""

  // The intent is captured verbatim in the audit metadata, so the original
  // selection stays reconstructable even after the case is reclassified.
  const created = await engine.repository.createCase({
    title: definition.caseTitle,
    module: definition.module,
    intent: definition.legacyIntent,
    uiLocale: locale,
    conversationLocale: locale,
  })

  if (created.error || !created.data) {
    redirect(`/${locale}/guide?error=create-failed`)
  }

  if (description.trim().length > 0 && description.length <= TEXT_INTAKE_MAX_LENGTH) {
    const stored = await engine.repository.addTextIntake(created.data.id, {
      text: description,
      kind: "pasted_text",
      locale,
    })
    if (stored.error) {
      redirect(`${guideCasePath(locale, created.data.id)}?notice=intake-not-saved`)
    }
  }

  redirect(guideCasePath(locale, created.data.id))
}

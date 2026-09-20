"use server"

import { redirect } from "next/navigation"
import { createCaseEngine } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
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
    redirect(`/auth/login?next=${encodeURIComponent(`${locale}/guide`)}`)
  }

  const definition = guideIntentDefinition(rawIntent)

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

  redirect(guideCasePath(locale, created.data.id))
}
"use server"

import { redirect } from "next/navigation"
import { createCaseEngine } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"
import { guideCasePath } from "@/lib/horizon/guide/intents"
import { homeModules, isHorizonHomeModule } from "./registry"

/**
 * Opens a case for a home module selection and sends the user to it.
 *
 * Uses the same P5 engine and the same destination as the guide, so the home
 * screen and the guide cannot drift into two different case flows.
 */
export async function startModuleCase(formData: FormData) {
  const rawModule = formData.get("module")
  const rawLocale = formData.get("locale")
  const locale: Locale = typeof rawLocale === "string" && isLocale(rawLocale) ? rawLocale : defaultLocale

  if (!isHorizonHomeModule(rawModule)) {
    redirect(`/${locale}/dashboard?error=unknown-module`)
  }

  const engine = await createCaseEngine()
  if (!engine.repository) {
    redirect(`/auth/login?next=${encodeURIComponent(`${locale}/dashboard`)}`)
  }

  const definition = homeModules.find((entry) => entry.module === rawModule)
  if (!definition) redirect(`/${locale}/dashboard?error=unknown-module`)

  const created = await engine.repository.createCase({
    title: definition.caseTitle,
    module: definition.module,
    intent: definition.intent,
    uiLocale: locale,
    conversationLocale: locale,
  })

  if (created.error || !created.data) {
    redirect(`/${locale}/dashboard?error=create-failed`)
  }

  redirect(guideCasePath(locale, created.data.id))
}
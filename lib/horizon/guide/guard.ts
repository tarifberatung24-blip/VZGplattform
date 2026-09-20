import "server-only"
import { redirect } from "next/navigation"
import { createCaseEngine, type CaseEngineContext } from "@/lib/horizon/case"
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/dictionaries"

/**
 * Resolves the authenticated case engine for a guide route, or redirects to
 * login. Keeps the auth and locale normalisation out of every page.
 *
 * A missing Supabase configuration redirects to login rather than throwing,
 * so a preview deployment shows the auth surface instead of a 500.
 */
export async function requireGuideContext(rawLocale: string, nextPath: string): Promise<{
  engine: CaseEngineContext
  locale: Locale
}> {
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale
  const engine = await createCaseEngine()

  if (!engine.repository) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)
  }

  return { engine, locale }
}
/**
 * The visitor's answer to the cookie notice.
 *
 * Only technically necessary storage is in use today (sign-in session, language,
 * light or dark theme, side menu state), so there is nothing to consent to and
 * the notice is information only. Optional categories are listed in
 * `LIVE_OPTIONAL_COOKIES` once they exist; the notice then offers the choice.
 *
 * "partner" is live since impact.com (Shopify affiliate programme) was added: the script loads only
 * after a yes (see impact.ts and ImpactTracking). Whenever a category is added, bump
 * COOKIE_NOTICE_VERSION so everybody is asked again with the new wording, and make the new code
 * check `hasOptionalConsent(readStoredChoice(), id)`.
 * Consent is never assumed for a category that was not shown when the answer was given.
 */
export const COOKIE_NOTICE_VERSION = 2
export const COOKIE_NOTICE_STORAGE_KEY = "horizon_cookie_notice"
/** Fired on window after an answer is stored, so tracking can start without a reload. */
export const COOKIE_CHOICE_EVENT = "horizon:cookie-choice"
/** Fired on window to reopen the notice, for the "Cookie settings" links. */
export const OPEN_COOKIE_SETTINGS_EVENT = "horizon:cookie-settings"

export type OptionalCookieId = "partner"

/** Optional categories that are actually in use. */
export const LIVE_OPTIONAL_COOKIES: readonly OptionalCookieId[] = ["partner"]

export type CookieChoice = {
  version: number
  optional: Partial<Record<OptionalCookieId, boolean>>
  at: string
}

export function buildChoice(optional: Partial<Record<OptionalCookieId, boolean>>, now: Date = new Date()): CookieChoice {
  return { version: COOKIE_NOTICE_VERSION, optional, at: now.toISOString() }
}

export function parseChoice(raw: string | null | undefined): CookieChoice | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<CookieChoice> | null
    if (!value || typeof value !== "object") return null
    if (typeof value.version !== "number" || typeof value.at !== "string") return null
    if (!value.optional || typeof value.optional !== "object") return null
    return { version: value.version, optional: value.optional, at: value.at }
  } catch {
    return null
  }
}

/** True until the visitor has answered the current version of the notice. */
export function needsNotice(choice: CookieChoice | null): boolean {
  return !choice || choice.version !== COOKIE_NOTICE_VERSION
}

export function hasOptionalConsent(choice: CookieChoice | null, id: OptionalCookieId): boolean {
  return !!choice && choice.version === COOKIE_NOTICE_VERSION && choice.optional[id] === true
}

export function readStoredChoice(): CookieChoice | null {
  try {
    return parseChoice(window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function storeChoice(choice: CookieChoice): void {
  try {
    window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Storage can be blocked. The notice then shows again on the next visit, which is harmless.
  }
  window.dispatchEvent(new Event(COOKIE_CHOICE_EVENT))
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
}

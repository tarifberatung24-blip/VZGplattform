"use client"

import { useEffect } from "react"
import { COOKIE_CHOICE_EVENT, hasOptionalConsent, readStoredChoice } from "@/lib/cookies/consent"
import { loadImpact } from "@/lib/cookies/impact"

/**
 * Starts impact.com once the visitor has agreed to the "partner" category, on page load and
 * right after the answer is given. Renders nothing.
 */
export function ImpactTracking() {
  useEffect(() => {
    const start = () => {
      if (hasOptionalConsent(readStoredChoice(), "partner")) loadImpact()
    }
    start()
    window.addEventListener(COOKIE_CHOICE_EVENT, start)
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, start)
  }, [])
  return null
}

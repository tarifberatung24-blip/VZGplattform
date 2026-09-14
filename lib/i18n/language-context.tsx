"use client"

import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { getDictionary, type Dictionary, type Locale, defaultLocale } from "./dictionaries"

type LanguageContextValue = {
  locale: Locale
  t: Dictionary
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const COOKIE_KEY = "finanzbg_locale"

export function LanguageProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    const pathLocale = window.location.pathname.split("/")[1]
    if (pathLocale === "bg" || pathLocale === "de") setLocaleState(pathLocale)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof document !== "undefined") {
      document.documentElement.lang = next
      // 1 year persistence
      document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`
    }
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t: getDictionary(locale), setLocale }),
    [locale, setLocale],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return ctx
}

export const LOCALE_COOKIE_KEY = COOKIE_KEY

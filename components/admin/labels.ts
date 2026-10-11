import type { AdminFlag, AdminUserRow } from "@/lib/admin/journey-summary"

export type AdminLocale = "bg" | "de"

const TIME_ZONE = "Europe/Berlin"

const MODULES: Record<string, { bg: string; de: string }> = {
  home: { bg: "Начало", de: "Start" },
  dashboard: { bg: "Табло", de: "Dashboard" },
  documents: { bg: "Документи", de: "Dokumente" },
  vertraege: { bg: "Договори", de: "Verträge" },
  steuer: { bg: "Данъци", de: "Steuer" },
  kindergeld: { bg: "Детски надбавки", de: "Kindergeld" },
  jobcenter: { bg: "Джобцентър", de: "Jobcenter" },
  inkasso: { bg: "Инкасо", de: "Inkasso" },
  guide: { bg: "Нов случай", de: "Neuer Vorgang" },
  profil: { bg: "Профил", de: "Profil" },
  onboarding: { bg: "Онбординг", de: "Onboarding" },
  anspruch: { bg: "Проверка на права", de: "Anspruchsprüfung" },
  finanzamt: { bg: "Финансова служба", de: "Finanzamt" },
  assistant: { bg: "Асистент", de: "Assistent" },
  versicherungen: { bg: "Застраховки", de: "Versicherungen" },
  konto: { bg: "Акаунт", de: "Konto" },
  auth: { bg: "Вход", de: "Anmeldung" },
}

export function placeLabel(module: string, step: string | null, locale: AdminLocale): string {
  const name = MODULES[module]?.[locale] ?? module
  return step ? `${name} › ${step}` : name
}

function format(iso: string | null, locale: AdminLocale, options: Intl.DateTimeFormatOptions): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "bg-BG", { ...options, timeZone: TIME_ZONE }).format(date)
}

export const formatDateTime = (iso: string | null, locale: AdminLocale) => format(iso, locale, { dateStyle: "short", timeStyle: "short" })
export const formatDay = (iso: string | null, locale: AdminLocale) => format(iso, locale, { weekday: "short", day: "numeric", month: "long", year: "numeric" })
export const formatTime = (iso: string | null, locale: AdminLocale) => format(iso, locale, { hour: "2-digit", minute: "2-digit" })

export const ADMIN_COPY = {
  bg: {
    title: "Потребители",
    subtitle: "Кой къде се затруднява. Данни от последните 30 дни.",
    stats: (total: number, help: number) => `${total} потребители, ${help} с нужда от помощ`,
    privacy: "Всеки преглед на тази страница се записва в журнала.",
    empty: "Още няма регистрирани потребители.",
    partial: "Част от данните не се заредиха:",
    last: "Последно",
    noActivity: "Няма записана активност",
    recordingOff: "Записът е изключен от потребителя",
    back: "Всички потребители",
    write: "Пиши лично",
    registered: "Регистрация",
    lastSignIn: "Последен вход",
    onboarding: "Онбординг",
    onboardingDone: "завършен",
    onboardingNone: "не е започнат",
    terms: "Условия",
    termsYes: "приети",
    termsNo: "не са приети",
    recording: "Запис",
    on: "включен",
    off: "изключен",
    modules: "Модули за 30 дни",
    timeline: "Хронология",
    timelineNote: "Последните 200 действия, време по Германия.",
    noEvents: "Няма записани действия.",
    opened: "Отвори",
    error: (code: string | null) => `Грешка: ${code ?? "неизвестна"}`,
    never: "няма",
  },
  de: {
    title: "Nutzer",
    subtitle: "Wer wo nicht weiterkommt. Daten der letzten 30 Tage.",
    stats: (total: number, help: number) => `${total} Nutzer, ${help} brauchen Hilfe`,
    privacy: "Jeder Aufruf dieser Seite wird protokolliert.",
    empty: "Noch keine registrierten Nutzer.",
    partial: "Ein Teil der Daten wurde nicht geladen:",
    last: "Zuletzt",
    noActivity: "Keine Aktivität aufgezeichnet",
    recordingOff: "Aufzeichnung vom Nutzer ausgeschaltet",
    back: "Alle Nutzer",
    write: "Persönlich schreiben",
    registered: "Registriert",
    lastSignIn: "Letzte Anmeldung",
    onboarding: "Onboarding",
    onboardingDone: "abgeschlossen",
    onboardingNone: "nicht begonnen",
    terms: "Bedingungen",
    termsYes: "akzeptiert",
    termsNo: "nicht akzeptiert",
    recording: "Aufzeichnung",
    on: "an",
    off: "aus",
    modules: "Module, 30 Tage",
    timeline: "Verlauf",
    timelineNote: "Die letzten 200 Aktionen, deutsche Zeit.",
    noEvents: "Keine Aktionen aufgezeichnet.",
    opened: "Geöffnet",
    error: (code: string | null) => `Fehler: ${code ?? "unbekannt"}`,
    never: "keine",
  },
} as const

export const FLAG_TONE: Record<AdminFlag, string> = {
  errors: "bg-destructive/10 text-destructive",
  loop: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  onboarding: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  inactive: "bg-muted text-muted-foreground",
  terms: "bg-muted text-muted-foreground",
}

export function flagLabel(flag: AdminFlag, row: AdminUserRow, locale: AdminLocale): string {
  const de = locale === "de"
  switch (flag) {
    case "errors":
      return de
        ? `${row.errors7d} Fehler in 7 Tagen`
        : row.errors7d === 1 ? "1 грешка за 7 дни" : `${row.errors7d} грешки за 7 дни`
    case "loop": {
      const place = row.loop ? placeLabel(row.loop.module, row.loop.step, locale) : ""
      const count = row.loop?.count ?? 0
      return de ? `Kommt nicht weiter: ${place} (${count}×)` : `Затруднява се: ${place} (${count}×)`
    }
    case "onboarding":
      return de
        ? `Onboarding nicht abgeschlossen${row.onboardingStep ? `: ${row.onboardingStep}` : ""}`
        : `Онбордингът не е завършен${row.onboardingStep ? `: ${row.onboardingStep}` : ""}`
    case "inactive":
      return de ? "Seit über 7 Tagen inaktiv" : "Без активност над 7 дни"
    case "terms":
      return de ? "Bedingungen nicht akzeptiert" : "Условията не са приети"
  }
}

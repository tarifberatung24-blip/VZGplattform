import { stripLocale } from "./i18n/routing"

export const kintexModules = [
  { id: "overview", href: "/protected", bg: "Преглед", de: "Übersicht" },
  { id: "contracts", href: "/vertraege", bg: "Договори", de: "Verträge" },
  { id: "insurance", href: "/protected?module=insurance", bg: "Застраховки", de: "Versicherungen", planned: true },
  { id: "credits", href: "/protected?module=credits", bg: "Кредити", de: "Kredite", planned: true },
  { id: "documents", href: "/documents", bg: "Документи", de: "Dokumente" },
  { id: "education", href: "/finanzbildung", bg: "Финансово обучение", de: "Finanzbildung" },
  { id: "deadlines", href: "/protected?module=deadlines", bg: "Срокове", de: "Fristen", planned: true },
  { id: "opportunities", href: "/protected?module=opportunities", bg: "Възможности", de: "Möglichkeiten", planned: true },
  { id: "assistant", href: "/protected/home-office", bg: "Умен чатбот", de: "Smart Chatbot" },
  { id: "profile", href: "/profil", bg: "Профил", de: "Profil" },
] as const

// Presentation only. Access control remains in the existing Supabase proxy/pages.
export function isKintexWorkspacePath(pathname: string) {
  const path = stripLocale(pathname)
  return ["/dashboard", "/protected", "/vertraege", "/documents", "/finanzbildung", "/profil", "/steuer", "/finanzamt"]
    .some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function activeKintexModule(pathname: string, module: string | null) {
  const path = stripLocale(pathname)
  if (path === "/protected" || path === "/dashboard") {
    return kintexModules.find((item) => "planned" in item && item.id === module)?.id ?? "overview"
  }
  return kintexModules.find((item) => item.id !== "overview" && !item.href.includes("?") &&
    (path === item.href || path.startsWith(`${item.href}/`)))?.id ?? null
}

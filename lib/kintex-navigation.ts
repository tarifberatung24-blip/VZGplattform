import { stripLocale } from "./i18n/routing"

export const kintexModules = [
  { id: "overview", href: "/dashboard", bg: "Преглед", de: "Übersicht" },
  { id: "contracts", href: "/vertraege", bg: "Договори", de: "Verträge" },
  { id: "insurance", href: "/dashboard?module=insurance", bg: "Застраховки", de: "Versicherungen", planned: true },
  { id: "credits", href: "/dashboard?module=credits", bg: "Кредити", de: "Kredite", planned: true },
  { id: "documents", href: "/documents", bg: "Документи", de: "Dokumente" },
  { id: "education", href: "/finanzbildung", bg: "Финансово обучение", de: "Finanzbildung" },
  { id: "deadlines", href: "/dashboard?module=deadlines", bg: "Срокове", de: "Fristen", planned: true },
  { id: "opportunities", href: "/dashboard?module=opportunities", bg: "Възможности", de: "Möglichkeiten", planned: true },
  { id: "assistant", href: "/assistant", bg: "Умен чатбот", de: "Smart Chatbot" },
  { id: "profile", href: "/profil", bg: "Профил", de: "Profil" },
] as const

// Presentation only. Access control remains in the existing Supabase proxy/pages.
//
// Every prefix here must be an authenticated route, because the HORIZON shell hides the public
// header and footer and shows account controls. Verifying the list against the protection source
// is required; see lib/kintex-navigation.test.ts. `/anspruch` and `/email-generator` resolve for
// anonymous visitors, so they are deliberately excluded.
export function isKintexWorkspacePath(pathname: string) {
  const path = stripLocale(pathname)
  return ["/dashboard", "/protected", "/vertraege", "/documents", "/finanzbildung", "/profil", "/konto", "/assistant", "/steuer", "/finanzamt", "/guide"]
    .some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function activeKintexModule(pathname: string, module: string | null) {
  const path = stripLocale(pathname)
  if (path === "/protected/home-office") return "assistant"
  if (path === "/protected" || path === "/dashboard") {
    return kintexModules.find((item) => "planned" in item && item.id === module)?.id ?? "overview"
  }
  return kintexModules.find((item) => item.id !== "overview" && !item.href.includes("?") &&
    (path === item.href || path.startsWith(`${item.href}/`)))?.id ?? null
}

// Routes that render their own complete chrome (header and footer) and must therefore not also
// receive the public Layer 0 chrome. `/office` ships its own header — brand, language select and
// the toggle for its own sidebar — so the public header above it produced two stacked headers.
//
// This is deliberately NOT expressed through `isKintexWorkspacePath`: `/office` is not behind the
// proxy's protection boundary, and `isKintexWorkspacePath` also drives the HORIZON shell, which
// would put account controls on a route an anonymous visitor can open. Matching is exact, not
// prefix-based: `/office/cases/[id]` has no header of its own and still needs the public one.
const selfChromedPaths = ["/office"] as const

export function isSelfChromedPath(pathname: string) {
  return (selfChromedPaths as readonly string[]).includes(stripLocale(pathname))
}

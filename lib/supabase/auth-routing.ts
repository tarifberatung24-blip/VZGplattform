import { stripLocale } from "../i18n/routing"

const protectedPrefixes = [
  "/protected",
  "/profil",
  "/finanzamt",
  "/steuer",
  "/vertraege",
  "/documents",
  "/auth/update-password",
]

export function sanitizeNextPath(value: string | null | undefined, fallback = "/protected") {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback
}

export function isProtectedAppPath(pathname: string) {
  const path = stripLocale(pathname)
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function requiresMfa(currentLevel: string | null | undefined, nextLevel: string | null | undefined) {
  return currentLevel === "aal1" && nextLevel === "aal2"
}

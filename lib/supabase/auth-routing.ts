import { stripLocale } from "../i18n/routing"

const protectedPrefixes = [
  "/dashboard",
  "/assistant",
  "/security",
  "/protected",
  "/profil",
  "/finanzamt",
  "/steuer",
  "/anspruch",
  "/vertraege",
  "/documents",
  "/finanzbildung",
  "/auth/update-password",
]

export function sanitizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback
}

export function requestOrigin(headers: Headers, fallback: string) {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const host = forwardedHost || headers.get("host")?.split(",")[0]?.trim()
  if (!host || host.includes("localhost")) return fallback
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  return `${forwardedProto === "http" ? "http" : "https"}://${host}`
}

export function isProtectedAppPath(pathname: string) {
  const path = stripLocale(pathname)
  if (path === "/protected") return false
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function requiresMfa(currentLevel: string | null | undefined, nextLevel: string | null | undefined) {
  return currentLevel === "aal1" && nextLevel === "aal2"
}

import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import path from "node:path"
import { legacyRedirectTarget, legacyRedirects } from "./legacy-redirects"
import { isProtectedAppPath } from "@/lib/supabase/auth-routing"

const root = process.cwd()

/**
 * Candidate page files for an unlocalized app path, e.g. `/guide` is served by
 * `app/[locale]/guide/page.tsx` while `/dashboard` has a top-level `app/dashboard/page.tsx`.
 */
const routeFiles = (href: string) => [
  path.join(root, "app", href.slice(1), "page.tsx"),
  path.join(root, "app/[locale]", href.slice(1), "page.tsx"),
]

/** Whether a path renders a page at either location. */
const rendersPage = (href: string) => routeFiles(href).some(existsSync)

describe("N7 legacy redirects", () => {
  it("forwards each documented legacy surface to its canonical destination", () => {
    expect(legacyRedirectTarget("/bg/office")).toBe("/guide")
    expect(legacyRedirectTarget("/de/check")).toBe("/dashboard")
    expect(legacyRedirectTarget("/bg/uslugi")).toBe("/functions")
    expect(legacyRedirectTarget("/de/produkte")).toBe("/functions")
    expect(legacyRedirectTarget("/bg/tarife")).toBe("/versicherungen")
    expect(legacyRedirectTarget("/de/protected/home-office")).toBe("/assistant")
    expect(legacyRedirectTarget("/bg/protected/security")).toBe("/konto/sicherheit")
    expect(legacyRedirectTarget("/de/onboarding/language")).toBe("/onboarding/profile")
  })

  it("works without a locale prefix, which the proxy adds", () => {
    for (const path of Object.keys(legacyRedirects)) {
      expect(legacyRedirectTarget(path)).toBe(legacyRedirects[path])
    }
  })

  it("carries the case id from the legacy office case detail", () => {
    expect(legacyRedirectTarget("/bg/office/cases/abc-123")).toBe("/guide/abc-123")
    expect(legacyRedirectTarget("/de/office/cases/9f8e")).toBe("/guide/9f8e")
  })

  it("does not carry extra path segments or a query into the target", () => {
    // Only a single segment is captured; anything deeper is not a documented candidate.
    expect(legacyRedirectTarget("/bg/office/cases/abc/extra")).toBeNull()
    expect(legacyRedirectTarget("/bg/office/cases")).toBeNull()
  })

  it("keeps the routes the site map marks KEEP reachable", () => {
    // `FINAL_SITE_MAP.md` §8 keeps these; a redirect here would break a live channel.
    for (const path of ["/kindergeld", "/za-nas", "/app", "/anfrage", "/zayavka", "/bg/kindergeld"]) {
      expect(legacyRedirectTarget(path)).toBeNull()
    }
    // `/email-generator` is RETIRE-on-approval, not yet approved.
    expect(legacyRedirectTarget("/bg/email-generator")).toBeNull()
  })

  it("never redirects a canonical destination", () => {
    for (const path of ["/dashboard", "/guide", "/documents", "/vertraege", "/steuer", "/profil", "/finanzbildung", "/konto/sicherheit"]) {
      expect(legacyRedirectTarget(path)).toBeNull()
    }
  })

  it("points every authenticated target at a real, protected route", () => {
    // A redirect into a missing route would 404; into an unprotected route it would expose the
    // workspace shell to an anonymous visitor. `/functions` is the one public target.
    const publicTargets = new Set(["/functions", "/versicherungen"])
    for (const target of Object.values(legacyRedirects)) {
      expect(rendersPage(target), `${target} must render a page`).toBe(true)
      if (!publicTargets.has(target)) {
        expect(isProtectedAppPath(target), `${target} must be protected`).toBe(true)
      }
    }
    expect(isProtectedAppPath("/guide/abc-123")).toBe(true)
  })

  it("has no legacy page left for a redirected route", () => {
    // The proxy answers these before routing, so a page file would be unreachable dead code.
    for (const legacy of ["/office", "/check", "/uslugi", "/produkte", "/tarife", "/protected/security", "/protected/home-office"]) {
      expect(rendersPage(legacy), `${legacy} should have no page`).toBe(false)
    }
  })
})

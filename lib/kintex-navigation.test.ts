import { describe, expect, it } from "vitest"
import { activeKintexModule, isKintexWorkspacePath, isSelfChromedPath, kintexModules } from "./kintex-navigation"
import { isProtectedAppPath } from "./supabase/auth-routing"
import { stripLocale } from "./i18n/routing"

describe("KintexBG workspace navigation", () => {
  it("keeps all ten modules under the existing authentication boundary", () => {
    expect(kintexModules).toHaveLength(10)
    for (const item of kintexModules) {
      const path = item.href.split("?")[0]
      expect(isProtectedAppPath(`/bg${path}`)).toBe(path !== "/protected")
      expect(isKintexWorkspacePath(`/de${path}`)).toBe(true)
    }
  })

  it("selects future sections from the URL and handles unknown sections", () => {
    expect(activeKintexModule("/bg/protected", "insurance")).toBe("insurance")
    expect(activeKintexModule("/de/protected", "deadlines")).toBe("deadlines")
    expect(activeKintexModule("/protected", "unknown")).toBe("overview")
    expect(activeKintexModule("/protected", null)).toBe("overview")
  })

  it("keeps existing module pages active without selecting overview as well", () => {
    expect(activeKintexModule("/bg/protected/home-office", null)).toBe("assistant")
    expect(activeKintexModule("/de/vertraege", "credits")).toBe("contracts")
    expect(activeKintexModule("/bg/profil", null)).toBe("profile")
    expect(activeKintexModule("/protected/security", null)).toBeNull()
  })

  it("preserves public pages and authentication screens", () => {
    for (const path of ["/", "/bg", "/de/uslugi", "/bg/auth/login", "/auth/update-password", "/bg/kindergeld", "/documents-other"]) {
      expect(isKintexWorkspacePath(path)).toBe(false)
    }
    expect(isKintexWorkspacePath("/de/steuer/review")).toBe(true)
  })

  it("does not treat public routes as workspace routes", () => {
    // These resolve for an anonymous visitor (see the protection assertions below), so the
    // authenticated shell must not wrap them.
    for (const path of ["/bg/anspruch", "/de/anspruch", "/bg/email-generator", "/de/email-generator"]) {
      expect(isKintexWorkspacePath(path)).toBe(false)
      expect(isProtectedAppPath(path)).toBe(false)
    }
  })

  it("keeps representative authenticated routes inside the workspace", () => {
    for (const path of ["/bg/dashboard", "/bg/vertraege", "/bg/documents", "/bg/steuer", "/bg/guide"]) {
      expect(isKintexWorkspacePath(path)).toBe(true)
      expect(isProtectedAppPath(path)).toBe(true)
    }
  })

  it("only wraps routes inside the protection boundary", () => {
    // The workspace shell hides the public header/footer and shows account controls, so any
    // path it matches must also be proxy-protected. `/protected` is the documented exception:
    // isProtectedAppPath excludes it while its children (/protected/home-office) are protected.
    const probes = [
      "/bg/dashboard", "/bg/vertraege", "/bg/documents", "/bg/steuer", "/bg/steuer/review",
      "/bg/guide", "/bg/guide/case-1", "/bg/profil", "/bg/assistant", "/bg/finanzbildung",
      "/bg/finanzamt", "/bg/protected/home-office", "/bg/anspruch", "/bg/email-generator",
      "/bg/uslugi", "/bg/tarife", "/bg/auth/login", "/bg/kindergeld",
    ]
    for (const path of probes) {
      if (isKintexWorkspacePath(path) && stripLocale(path) !== "/protected") {
        expect(isProtectedAppPath(path)).toBe(true)
      }
    }
  })
})

describe("self-chromed routes", () => {
  it("matches the office landing page in every locale", () => {
    for (const path of ["/office", "/bg/office", "/de/office"]) {
      expect(isSelfChromedPath(path)).toBe(true)
    }
  })

  it("does not match the office case detail, which has no header of its own", () => {
    // `/office/cases/[id]` renders content only, so suppressing the public header there would
    // leave the page with no chrome at all.
    for (const path of ["/office/cases/abc", "/bg/office/cases/abc", "/de/office/cases/abc"]) {
      expect(isSelfChromedPath(path)).toBe(false)
    }
  })

  it("does not match the HORIZON workspace or public routes", () => {
    for (const path of ["/dashboard", "/bg/dashboard", "/bg/steuer", "/", "/de/uslugi", "/bg/auth/login"]) {
      expect(isSelfChromedPath(path)).toBe(false)
    }
  })

  it("never overlaps the workspace shell", () => {
    // Overlap would put HORIZON account controls on a route an anonymous visitor can open.
    for (const path of ["/office", "/bg/office", "/de/office"]) {
      expect(isKintexWorkspacePath(path)).toBe(false)
      expect(isProtectedAppPath(path)).toBe(false)
    }
  })
})

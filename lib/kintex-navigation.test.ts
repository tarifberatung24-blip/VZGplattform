import { describe, expect, it } from "vitest"
import { activeKintexModule, isKintexWorkspacePath, kintexModules } from "./kintex-navigation"
import { isProtectedAppPath } from "./supabase/auth-routing"

describe("KintexBG workspace navigation", () => {
  it("keeps all nine modules under the existing authentication boundary", () => {
    expect(kintexModules).toHaveLength(9)
    for (const item of kintexModules) {
      const path = item.href.split("?")[0]
      expect(isProtectedAppPath(`/bg${path}`)).toBe(true)
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
})

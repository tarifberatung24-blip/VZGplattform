import { describe, expect, it } from "vitest"
import { activeVzgModule, isVzgWorkspacePath, vzgModules } from "./vzg-navigation"
import { isProtectedAppPath } from "./supabase/auth-routing"

describe("VZGplattform workspace navigation", () => {
  it("keeps all nine modules under the existing authentication boundary", () => {
    expect(vzgModules).toHaveLength(9)
    for (const item of vzgModules) {
      const path = item.href.split("?")[0]
      expect(isProtectedAppPath(`/bg${path}`)).toBe(true)
      expect(isVzgWorkspacePath(`/de${path}`)).toBe(true)
    }
  })

  it("selects future sections from the URL and handles unknown sections", () => {
    expect(activeVzgModule("/bg/protected", "insurance")).toBe("insurance")
    expect(activeVzgModule("/de/protected", "deadlines")).toBe("deadlines")
    expect(activeVzgModule("/protected", "unknown")).toBe("overview")
    expect(activeVzgModule("/protected", null)).toBe("overview")
  })

  it("keeps existing module pages active without selecting overview as well", () => {
    expect(activeVzgModule("/bg/protected/home-office", null)).toBe("assistant")
    expect(activeVzgModule("/de/vertraege", "credits")).toBe("contracts")
    expect(activeVzgModule("/bg/profil", null)).toBe("profile")
    expect(activeVzgModule("/protected/security", null)).toBeNull()
  })

  it("preserves public pages and authentication screens", () => {
    for (const path of ["/", "/bg", "/de/uslugi", "/bg/auth/login", "/auth/update-password", "/bg/kindergeld", "/documents-other"]) {
      expect(isVzgWorkspacePath(path)).toBe(false)
    }
    expect(isVzgWorkspacePath("/de/steuer/review")).toBe(true)
  })
})

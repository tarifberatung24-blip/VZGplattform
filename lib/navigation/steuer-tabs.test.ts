import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import path from "node:path"
import { activeSteuerTab, steuerTabLabel, steuerTabs } from "./steuer-tabs"

const root = process.cwd()

describe("Steuer section tabs", () => {
  it("surfaces the index, review and providers pages exactly once", () => {
    expect(steuerTabs.map((tab) => tab.href)).toEqual(["/steuer", "/steuer/review", "/steuer/providers"])
  })

  it("only links to pages that exist", () => {
    // The whole point of N6 is that these two routes were unreachable. A tab pointing at a
    // removed route would be worse than no tab at all.
    for (const tab of steuerTabs) {
      expect(existsSync(path.join(root, "app", tab.href.slice(1), "page.tsx"))).toBe(true)
    }
  })

  it("selects the index tab only on the index path", () => {
    // Without the `exact` flag `/steuer/review` also matched `/steuer`, so the index stayed
    // highlighted while a sibling tab was open.
    expect(activeSteuerTab("/bg/steuer")).toBe("/steuer")
    expect(activeSteuerTab("/de/steuer")).toBe("/steuer")
    expect(activeSteuerTab("/steuer")).toBe("/steuer")
  })

  it("selects the sibling tabs, including on nested paths", () => {
    expect(activeSteuerTab("/bg/steuer/review")).toBe("/steuer/review")
    expect(activeSteuerTab("/de/steuer/providers")).toBe("/steuer/providers")
    expect(activeSteuerTab("/bg/steuer/review/detail")).toBe("/steuer/review")
  })

  it("returns null outside the Steuer section", () => {
    for (const path of ["/bg/dashboard", "/de/vertraege", "/bg/steuerlich", "/"]) {
      expect(activeSteuerTab(path)).toBeNull()
    }
  })

  it("labels every tab in both locales without falling back to a key", () => {
    for (const tab of steuerTabs) {
      for (const locale of ["bg", "de"] as const) {
        const label = steuerTabLabel(locale, tab.labelKey)
        expect(label.length).toBeGreaterThan(0)
        expect(label).not.toBe(tab.labelKey)
      }
    }
  })
})

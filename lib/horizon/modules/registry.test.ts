import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { CASE_INTENTS, CASE_MODULES } from "../case/contract"
import { GUIDE_INTENTS } from "../guide/intents"
import {
  HORIZON_HOME_MODULES,
  homeModuleCaseTitle,
  homeModuleGuideIntent,
  homeModuleIntent,
  homeModules,
  homeShortcuts,
  isHomeShortcutId,
  isHorizonHomeModule,
} from "./registry"

describe("horizon home modules", () => {
  it("exposes exactly the five required entry modules in map order", () => {
    expect(HORIZON_HOME_MODULES).toEqual([
      "agentur_fuer_arbeit",
      "jobcenter",
      "kuendigung",
      "steuererklaerung",
      "unterlagen_erklaeren",
    ])
    expect(homeModules).toHaveLength(5)
  })

  it("rejects unknown modules rather than defaulting to one", () => {
    expect(isHorizonHomeModule("jobcenter")).toBe(true)
    expect(isHorizonHomeModule("capital")).toBe(false)
    expect(isHorizonHomeModule(null)).toBe(false)
    expect(isHorizonHomeModule(1)).toBe(false)
  })

  it("keeps every home module inside the canonical module vocabulary", () => {
    for (const caseModule of HORIZON_HOME_MODULES) {
      expect(CASE_MODULES).toContain(caseModule)
    }
  })

  it("keeps every intent inside the cases.intent CHECK vocabulary", () => {
    for (const definition of homeModules) {
      expect(CASE_INTENTS).toContain(definition.intent)
      expect(homeModuleIntent[definition.module]).toBe(definition.intent)
    }
  })

  it("uses the Agentur für Arbeit spelling with the umlaut", () => {
    expect(homeModuleCaseTitle.agentur_fuer_arbeit).toBe("Anliegen bei der Agentur für Arbeit")
  })

  it("gives each module a distinct German case title", () => {
    const titles = homeModules.map((entry) => entry.caseTitle)
    expect(new Set(titles).size).toBe(titles.length)
    for (const title of titles) expect(title.length).toBeGreaterThan(0)
  })

  it("does not invent Kündigungsfristen or any date while creating a case", () => {
    // The registry is what the create path reads. A deadline here would be a
    // fabricated legal fact, so its absence is asserted explicitly.
    for (const definition of homeModules) {
      expect(JSON.stringify(definition)).not.toMatch(/deadline|frist|kündigungsfrist|kuendigungsfrist/i)
    }
  })

  it("maps only modules with a real guide equivalent", () => {
    expect(homeModuleGuideIntent.kuendigung).toBe("cancel_contract")
    expect(homeModuleGuideIntent.unterlagen_erklaeren).toBe("understand_document")
    // No unrelated mapping may be invented for the remaining three.
    expect(homeModuleGuideIntent.agentur_fuer_arbeit).toBeUndefined()
    expect(homeModuleGuideIntent.jobcenter).toBeUndefined()
    expect(homeModuleGuideIntent.steuererklaerung).toBeUndefined()
  })

  it("keeps every guide mapping inside the guide vocabulary", () => {
    for (const value of Object.values(homeModuleGuideIntent)) {
      expect(GUIDE_INTENTS).toContain(value)
    }
  })

  it("points every shortcut at a path, never an external or empty target", () => {
    for (const item of homeShortcuts) {
      expect(item.path.startsWith("/")).toBe(true)
      expect(item.path.startsWith("//")).toBe(false)
      expect(item.labelBg.length).toBeGreaterThan(0)
      expect(item.labelDe.length).toBeGreaterThan(0)
    }
    expect(isHomeShortcutId("cases")).toBe(true)
    expect(isHomeShortcutId("nope")).toBe(false)
  })

  it("does not link to a route that has no page", () => {
    // /settings was considered and deliberately excluded: no page exists, so a
    // link to it would be a dead end.
    for (const item of homeShortcuts) {
      expect(item.path).not.toBe("/settings")
    }
  })
})

describe("case intent vocabulary matches the database constraint", () => {
  it("lists exactly the intents the baseline migration allows", () => {
    // Read from the migration rather than restated, so adding a value in one
    // place without the other fails here instead of on an insert.
    const sql = readFileSync(
      new URL(
        "../../../supabase/migrations/20260909112037_kintex_assistant_baseline.sql",
        import.meta.url,
      ),
      "utf8",
    )
    const match = sql.match(/intent text not null default '\w+' check\(intent in \(([^)]*)\)\)/)
    expect(match).not.toBeNull()

    const declared = match![1].split(",").map((part) => part.trim().replace(/^'|'$/g, ""))
    expect([...declared].sort()).toEqual([...CASE_INTENTS].sort())
  })
})
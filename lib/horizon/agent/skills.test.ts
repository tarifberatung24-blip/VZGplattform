import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listAlphaAgents } from "./team"
import { assertAlphaSkillContracts, getAlphaSkillContracts } from "./skills"

describe("Horizon Alpha Team skill contracts", () => {
  it("resolves every registry skill file", () => {
    const contracts = getAlphaSkillContracts(listAlphaAgents())
    expect(contracts).toHaveLength(7)
    expect(contracts.map((contract) => contract.sopId)).toEqual([
      "SOP-CONDUCTOR-001",
      "SOP-DOCUMENTS-001",
      "SOP-FINANCE-001",
      "SOP-SOCIAL-001",
      "SOP-COMMS-001",
      "SOP-OPS-001",
      "SOP-QUALITY-001",
    ])
  })

  it("requires versioned refusal boundaries for every skill", () => {
    expect(assertAlphaSkillContracts(listAlphaAgents())).toBe(true)
    for (const contract of getAlphaSkillContracts(listAlphaAgents())) {
      expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(contract.operations.length).toBeGreaterThan(0)
      expect(contract.refusalConditions.length).toBeGreaterThan(0)
    }
  })

  it("ships the markdown contract named by every registry agent", () => {
    for (const agent of listAlphaAgents()) {
      const path = join(process.cwd(), agent.skillFile)
      expect(existsSync(path), agent.skillFile).toBe(true)
      const text = readFileSync(path, "utf8")
      expect(text).toContain(`**Version:**`)
      expect(text).toContain("## Refusal conditions")
      expect(text).toContain("## Output")
    }
  })
})

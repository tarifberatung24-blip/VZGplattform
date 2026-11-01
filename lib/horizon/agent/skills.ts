import type { AlphaAgent } from "./team"

export type AlphaSkillContract = {
  agentId: string
  sopId: string
  path: string
  version: string
  operations: string[]
  refusalConditions: string[]
}

const SKILL_METADATA: Record<string, { version: string; refusalConditions: string[] }> = {
  conductor: {
    version: "1.0.0",
    refusalConditions: ["unauthenticated user", "invalid case or document context", "autonomous external action"],
  },
  "document-intake": {
    version: "1.0.0",
    refusalConditions: ["document is not in the validated case", "source text is absent or unreadable", "unconfirmed fact required"],
  },
  "finance-tax": {
    version: "1.0.0",
    refusalConditions: ["unsupported tax result", "external filing or signing request", "missing or unconfirmed facts"],
  },
  "social-benefits": {
    version: "1.0.0",
    refusalConditions: ["eligibility guarantee request", "incomplete or contradictory evidence", "external submission request"],
  },
  correspondence: {
    version: "1.0.0",
    refusalConditions: ["missing material facts", "send or sign request", "unsupported legal or benefits determination"],
  },
  "deadline-monitor": {
    version: "1.0.0",
    refusalConditions: ["inferred date", "external transmission", "unresolved conflicting dates"],
  },
  "quality-safety": {
    version: "1.0.0",
    refusalConditions: ["missing provenance", "stale or absent approval", "unresolved critical facts", "autonomous external action"],
  },
}

export function getAlphaSkillContracts(agents: readonly AlphaAgent[]): AlphaSkillContract[] {
  return agents.map((agent) => {
    const metadata = SKILL_METADATA[agent.id]
    if (!metadata) throw new Error(`ALPHA_SKILL_METADATA_NOT_FOUND:${agent.id}`)
    return {
      agentId: agent.id,
      sopId: agent.sopId,
      path: agent.skillFile,
      version: metadata.version,
      operations: [...agent.operations],
      refusalConditions: [...metadata.refusalConditions],
    }
  })
}

export function assertAlphaSkillContracts(agents: readonly AlphaAgent[]): true {
  for (const contract of getAlphaSkillContracts(agents)) {
    if (!/^\d+\.\d+\.\d+$/.test(contract.version)) throw new Error(`ALPHA_SKILL_VERSION_INVALID:${contract.path}`)
    if (contract.operations.length === 0) throw new Error(`ALPHA_SKILL_OPERATIONS_MISSING:${contract.path}`)
    if (contract.refusalConditions.length === 0) throw new Error(`ALPHA_SKILL_REFUSALS_MISSING:${contract.path}`)
  }
  return true
}

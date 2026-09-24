#!/usr/bin/env node
/**
 * Horizon phase-scoped context loader.
 *
 * Reads only the requested phase sections out of the canonical Master Map and Build
 * Ledger so that a normal phase task does not have to load both documents in full.
 *
 * The Master Map stays the canonical architecture and the Build Ledger stays the
 * canonical status source; this script only extracts, it never restates.
 *
 * Usage: node scripts/horizon-context.mjs <PHASE>   e.g. P1 P5 P9 P12
 *
 * Node built-ins only. No npm dependency.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(SCRIPT_DIR, "..")
export const INDEX_PATH = resolve(REPO_ROOT, "docs/HORIZON_CONTEXT_INDEX.json")

const PRODUCED_KEYS = [
  "ACTIVE_PHASE",
  "PHASE_NAME",
  "CANONICAL_IDENTITY",
  "GOVERNANCE",
  "MASTER_MAP_CONTEXT",
  "BUILD_LEDGER_CONTEXT",
  "DEPENDENCIES",
  "FROZEN_SYSTEMS",
  "OWNER_APPROVAL_REQUIREMENTS",
  "OUT_OF_SCOPE",
  "SOURCE_FILES",
]

export class HorizonContextError extends Error {
  constructor(message) {
    super(message)
    this.name = "HorizonContextError"
  }
}

const text = (value) => String(value ?? "").trim()

export function loadIndex(indexPath = INDEX_PATH) {
  if (!existsSync(indexPath)) {
    throw new HorizonContextError(`Context index not found: ${indexPath}`)
  }
  let parsed
  try {
    parsed = JSON.parse(readFileSync(indexPath, "utf8"))
  } catch (error) {
    throw new HorizonContextError(`Context index is not valid JSON: ${error.message}`)
  }
  if (!parsed.phases || typeof parsed.phases !== "object") {
    throw new HorizonContextError("Context index has no phases map")
  }
  return parsed
}

export function readSourceSources(index) {
  const sources = {}
  for (const [key, relativePath] of Object.entries(index.sources ?? {})) {
    const absolute = resolve(REPO_ROOT, relativePath)
    if (!existsSync(absolute)) {
      throw new HorizonContextError(`Declared source file is missing: ${relativePath}`)
    }
    sources[key] = readFileSync(absolute, "utf8")
  }
  return sources
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Extract the body of the heading that starts with `headingPrefix`, stopping at the
 * next heading of the same or higher level. Returns the heading line plus its body.
 */
export function extractSection(markdown, headingPrefix) {
  const lines = markdown.split("\n")
  const start = lines.findIndex((line) => {
    const match = /^(#{1,6})\s+(.*)$/.exec(line)
    return match && match[2].startsWith(headingPrefix)
  })
  if (start === -1) return null

  const startLevel = /^(#{1,6})/.exec(lines[start])[1].length
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = /^(#{1,6})\s+/.exec(lines[i])
    if (match && match[1].length <= startLevel) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join("\n").replace(/\s+$/, "")
}

export function extractByHeadingName(markdown, headingName) {
  const lines = markdown.split("\n")
  const start = lines.findIndex((line) => {
    const match = /^(#{1,6})\s+(.*)$/.exec(line)
    return match && text(match[2]) === text(headingName)
  })
  if (start === -1) return null
  const startLevel = /^(#{1,6})/.exec(lines[start])[1].length
  let end = lines.length
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = /^(#{1,6})\s+/.exec(lines[i])
    if (match && match[1].length <= startLevel) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join("\n").replace(/\s+$/, "")
}

export function extractCanonicalIdentity(projectRules, pattern) {
  const expression = new RegExp(pattern, "gm")
  const matches = projectRules.match(expression)
  if (!matches || matches.length < 4) {
    throw new HorizonContextError(
      "Canonical identity block not found in PROJECT_RULES.md (expected four identity lines)",
    )
  }
  return matches.join("\n")
}

export function extractGovernance(agents, index) {
  const section = extractSection(agents, "Canonical build map and phase governance")
  if (!section) {
    throw new HorizonContextError(
      "Governance section 'Canonical build map and phase governance' not found in AGENTS.md",
    )
  }
  const files = Object.values(index.sources ?? {}).filter((value) => typeof value === "string")
  return [
    section,
    "",
    "Governance and canonical sources:",
    ...files.map((file) => `- ${file}`),
  ].join("\n")
}

/** Read the thin ledger index row so dependency and freeze summary need no full-phase scan. */
export function ledgerIndexRow(ledger, phase) {
  const line = ledger.split("\n").find((entry) => entry.startsWith(`| ${phase} |`))
  if (!line) return null
  const cells = line.split("|").slice(1, -1).map((cell) => text(cell))
  if (cells.length < 5) return null
  const [id, system, status, frozen, ownerApproval] = cells
  return { id, system, status, frozen, ownerApproval }
}

/** Mapped heading for a phase; fails non-zero when the mapping cannot be resolved. */
export function ledgerPhaseHeading(index, phase) {
  const digits = /^P(\d+)$/.exec(`${phase}`)
  if (!digits) return null
  // The marker form is derived from the ledger pattern itself, so index and ledger cannot drift.
  const marker = index.ledgerPhasePattern
    .replace(/^\^/, "")
    .replace(/^#{1,6}\s*/, "")
    .split("(")[0]
    .trim()
  return `${marker} ${digits[1]} —`
}

/** Extract exactly one phase record from the ledger. Never loads other phases. */
export function ledgerPhaseSection(ledger, index, phase) {
  const headingPrefix = ledgerPhaseHeading(index, phase)
  if (!headingPrefix) return null
  const heading = new RegExp(`^## ${escapeRegExp(headingPrefix)}.*$`, "m").exec(ledger)
  if (!heading) return null
  return extractByHeadingName(ledger, heading[0].replace(/^##\s+/, ""))
}

export function ledgerFrozenSummary(ledger, index) {
  const expression = new RegExp(index.ledgerFrozenPattern, "gm")
  const yes = []
  let match
  while ((match = expression.exec(ledger)) !== null) {
    if (match[1] === "YES") yes.push(match.index)
  }
  const phases = []
  const rows = ledger.split("\n").filter((line) => line.startsWith("| P"))
  for (const row of rows) {
    const cells = row.split("|").slice(1, -1).map((cell) => text(cell))
    if (cells.length >= 4 && cells[3] === "YES") phases.push(`${cells[0]} (${cells[1]})`)
  }
  return {
    frozenYesCount: yes.length,
    systemLine:
      yes.length === 0
        ? "NONE. No module is currently FROZEN. Freeze requires explicit owner acceptance."
        : "FROZEN modules are listed below. They must not be modified without explicit owner reopening.",
    phaseLines: phases,
    source: `docs/HORIZON_BUILD_LEDGER.md (exact form: ${index.ledgerFrozenPattern})`,
  }
}

/** Out-of-scope is a fixed summary plus the phase's own exclusion rule, not a bulk dump. */
export function outOfScopeSummary(index, phase) {
  const always = [
    "FROZEN modules: see FROZEN_SYSTEMS; do not modify them without explicit owner reopening.",
    "Capital code (lib/capital/**, docs/research/capital/**): PRESERVE / OUTSIDE CURRENT ACTIVE BUILD SEQUENCE.",
    "Application code, Supabase/schema/RLS, env, dependencies, lockfile, deployment: out of scope unless the owner authorizes it.",
    "Branding drift and KintexBG/HAMMAL legacy references: report only, do not fix and do not delete.",
  ]
  const extra = {
    P0: ["Application functionality, routes, UI redesign, Supabase changes, deployment."],
    P1: ["Layer 1 (onboarding), the Guide, and all authenticated modules."],
    P2: ["The Guide and all authenticated user modules."],
    P3: ["Authenticated user modules P4 and later."],
    P4: ["Phases P5 and later."],
    P5: ["Module workflows P6 and later."],
    P6: ["Phases P7 and later."],
    P7: ["Phases P8 and later."],
    P8: ["Phases P9 and later."],
    P9: ["Phases P10 and later."],
    P10: ["Phases P11 and later."],
    P11: ["Phases P12 and later."],
    P12: ["Phases P13 and later."],
    P13: ["Phases P14 and later."],
    P14: ["Phases P15 and later."],
    P15: ["Phases P16 and later."],
    P16: ["Phase P17."],
    P17: ["Capital work and any phase beyond the current sequence."],
  }
  const lines = [...always, ...(extra[phase] ?? [])]
  return { summary: lines.map((line) => `- ${line}`).join("\n"), extra: extra[phase] ?? [] }
}

export function masterMapContext(masterMap, index, phase) {
  const entry = index.phases[phase]

  // Explicit, bounded heading set per phase: one heading-list parse plus one
  // heading-list parse for the mapped engines. No recursion, no dependency expansion.
  const mappedHeadings = [
    ...(entry.masterMapHeadings ?? []),
    ...(entry.engines ?? []).map((engineId) => {
      const headingName = (index.engineHeadings ?? {})[engineId]
      if (!headingName) {
        throw new HorizonContextError(
          `No Master Map heading mapped for engine ${engineId} (phase ${phase})`,
        )
      }
      return headingName
    }),
  ]

  const sections = mappedHeadings.map((heading) => {
    // Headings here are full names; resolve by exact heading text, then by prefix.
    const section =
      extractByHeadingName(masterMap, heading) ?? extractSection(masterMap, heading)
    if (!section) {
      throw new HorizonContextError(
        `Master Map heading '${heading}' mapped for ${phase} was not found in docs/HORIZON_MASTER_MAP.md`,
      )
    }
    return section
  })

  if (sections.length === 0) {
    throw new HorizonContextError(`No Master Map context mapped for phase ${phase}`)
  }
  return sections.join("\n\n")
}

export function buildContext(phase, options = {}) {
  const index = options.index ?? loadIndex()
  const sources = options.sources ?? readSourceSources(index)

  const phaseKey = text(phase).toUpperCase()
  if (!/^P\d+$/.test(phaseKey)) {
    throw new HorizonContextError(
      `Invalid phase "${phaseKey}". Expected a phase id such as P1, P5, P9 or P12.`,
    )
  }
  if (!Object.prototype.hasOwnProperty.call(index.phases, phaseKey)) {
    throw new HorizonContextError(`Unknown phase "${phaseKey}". Not present in docs/HORIZON_CONTEXT_INDEX.json.`)
  }

  const row = ledgerIndexRow(sources.buildLedger, phaseKey)
  if (!row) {
    throw new HorizonContextError(
      `Phase ${phaseKey} is not present in the docs/HORIZON_BUILD_LEDGER.md index table.`,
    )
  }

  const phaseBody = ledgerPhaseSection(sources.buildLedger, index, phaseKey)
  if (!phaseBody) {
    throw new HorizonContextError(
      `Ledger heading for ${phaseKey} was not found in docs/HORIZON_BUILD_LEDGER.md.`,
    )
  }

  const frozen = ledgerFrozenSummary(sources.buildLedger, index)
  const scope = outOfScopeSummary(index, phaseKey)
  const canonicalIdentity = extractCanonicalIdentity(sources.projectRules, index.identityPattern)
  const governance = extractGovernance(sources.agents, index)

  const header = [
    `## ${row.id} — ${row.system}`,
    "",
    `Ledger index: status=${row.status} · frozen=${row.frozen} · owner approval=${row.ownerApproval}`,
  ].join("\n")

  const dependencies = [
    `- Ledger-declared dependencies: ${
      (/^- \*\*DEPENDENCIES:\*\* (.+)$/m.exec(phaseBody)?.[1] ?? "none").trim()
    }`,
    "- Dependency sections are deliberately not loaded; read a dependency's own record only if its work is required.",
  ].join("\n")

  const ownerApprovalField = /^- \*\*OWNER APPROVAL REQUIRED:\*\* (.+)$/m.exec(phaseBody)?.[1]?.trim()
  const ownerApproval = [
    `- Ledger index (authoritative): ${row.ownerApproval}`,
    ownerApprovalField
      ? `- Ledger phase field: ${ownerApprovalField}`
      : `- Ledger phase field: not present in the ${phaseKey} record`,
    "- Owner approval is required before merge, deployment, or any DB/schema/RLS/env change.",
  ].join("\n")

  const context = {
    ACTIVE_PHASE: phaseKey,
    PHASE_NAME: row.system,
    CANONICAL_IDENTITY: canonicalIdentity,
    GOVERNANCE: governance,
    MASTER_MAP_CONTEXT: masterMapContext(sources.masterMap, index, phaseKey),
    BUILD_LEDGER_CONTEXT: `${header}\n\n${phaseBody}`,
    DEPENDENCIES: dependencies,
    FROZEN_SYSTEMS: [
      frozen.systemLine,
      `Frozen count: YES = ${frozen.frozenYesCount}`,
      ...(frozen.phaseLines.length > 0 ? frozen.phaseLines.map((line) => `- ${line}`) : []),
      `Source: ${frozen.source}`,
    ].join("\n"),
    OWNER_APPROVAL_REQUIREMENTS: ownerApproval,
    OUT_OF_SCOPE: scope.summary,
    SOURCE_FILES: Object.entries(index.sources ?? {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n"),
  }

  return context
}

export async function main(argv = process.argv.slice(2)) {
  const phase = argv[0]
  if (!phase) {
    process.stderr.write("Usage: node scripts/horizon-context.mjs <PHASE>   e.g. P1 P5 P9 P12\n")
    return 1
  }

  let context
  try {
    context = buildContext(phase)
  } catch (error) {
    process.stderr.write(`HORIZON_CONTEXT_ERROR: ${error.message}\n`)
    return 1
  }

  const lines = []
  for (const key of PRODUCED_KEYS) {
    lines.push(`${key}:`)
    lines.push(context[key])
    lines.push("")
  }
  process.stdout.write(`${lines.join("\n").replace(/\s+$/, "")}\n`)
  return 0
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  try {
    const code = await main()
    process.exitCode = code
  } catch (error) {
    process.stderr.write(`HORIZON_CONTEXT_ERROR: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}

export { PRODUCED_KEYS }
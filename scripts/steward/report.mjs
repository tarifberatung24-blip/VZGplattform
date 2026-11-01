/**
 * Structured report generation for the HORIZON System Steward.
 *
 * The report is the deliverable. It is produced in two forms from one model:
 * JSON, which is the machine-readable record, and Markdown, which is what a
 * person reads. Both are generated from the same object so they cannot disagree.
 *
 * Two rules shape every function here:
 *
 *  - Verified facts, assumptions and recommendations are separated, not merged.
 *    A reader must be able to tell which is which without reading the prose.
 *  - Everything is redacted at the point of serialization, so no secret can
 *    reach the artifact through a field added later.
 */

import { redactDeep } from "./redact.mjs"

export const REPORT_SCHEMA_VERSION = "horizon-steward-report-v1"

export const PRIORITY = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
}

export const CONFIDENCE = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
}

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }

/**
 * Build one recommendation. Every field the task requires is mandatory here, so
 * a recommendation without evidence or effort cannot be constructed.
 */
export function recommendation(input) {
  const {
    priority,
    title,
    evidence,
    expectedBenefit,
    estimatedEffort,
    confidence,
    action,
    kind = "recommendation",
  } = input

  if (!Object.values(PRIORITY).includes(priority)) {
    throw new Error(`recommendation: invalid priority ${priority}`)
  }
  if (!Object.values(CONFIDENCE).includes(confidence)) {
    throw new Error(`recommendation: invalid confidence ${confidence}`)
  }

  return {
    kind,
    priority,
    title,
    evidence,
    expectedBenefit,
    estimatedEffort,
    confidence,
    action,
  }
}

/** Sort recommendations by priority, then keep insertion order within a level. */
export function sortRecommendations(items) {
  return [...items].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
}

/**
 * Derive recommended actions from the collected findings.
 *
 * Actions come from evidence only. Where a section had no data, the action is to
 * connect the missing source — not a speculative product change.
 */
export function deriveRecommendations(sections) {
  const items = []
  const { health, legal, technology, product } = sections

  for (const finding of health?.findings ?? []) {
    if (finding.severity === "critical") {
      items.push(
        recommendation({
          priority: PRIORITY.CRITICAL,
          title: `Resolve platform health issue: ${finding.code}`,
          evidence: finding.detail,
          expectedBenefit: "Restores confidence that the deployed revision is the verified one.",
          estimatedEffort: "Unknown until the cause is identified; start with the linked run.",
          confidence: CONFIDENCE.HIGH,
          action: "Open the linked workflow run or health response and identify the failing step.",
        }),
      )
    } else if (finding.severity === "warning") {
      items.push(
        recommendation({
          priority: PRIORITY.MEDIUM,
          title: `Review platform warning: ${finding.code}`,
          evidence: finding.detail,
          expectedBenefit: "Keeps deployment state and capability expectations accurate.",
          estimatedEffort: "Minutes to confirm whether the warning is expected.",
          confidence: CONFIDENCE.MEDIUM,
          action: "Confirm whether this state is expected; if not, investigate the source signal.",
        }),
      )
    }
  }

  const enacted = (legal?.enactedFindings ?? []).filter((finding) => finding.relevant)
  if (enacted.length > 0) {
    items.push(
      recommendation({
        priority: PRIORITY.HIGH,
        title: `Review ${enacted.length} relevant enacted legal change(s) against HORIZON modules`,
        evidence: enacted
          .slice(0, 3)
          .map((finding) => `${finding.title} (${finding.sourceName})`)
          .join("; "),
        expectedBenefit: "Keeps HORIZON guidance and forms aligned with current German law.",
        estimatedEffort: "One review pass per change; depends on whether a module is affected.",
        confidence: CONFIDENCE.HIGH,
        action: "Read each source text and decide whether a module, form or explanation needs updating.",
      }),
    )
  }

  const processOnly = (legal?.relevantFindings ?? []).filter((finding) => !finding.isEnactedLaw)
  if (processOnly.length > 0) {
    items.push(
      recommendation({
        priority: PRIORITY.LOW,
        title: `Track ${processOnly.length} relevant item(s) still in process`,
        evidence: `${processOnly.length} item(s) from parliamentary or ministry sources matched HORIZON terms but are not enacted law.`,
        expectedBenefit: "Early awareness before a change becomes law.",
        estimatedEffort: "No action now; re-check after the process advances.",
        confidence: CONFIDENCE.MEDIUM,
        action: "Monitor only. Do not treat these as law in product copy.",
      }),
    )
  }

  const topTech = (technology?.recommendations ?? []).slice(0, 3)
  for (const repo of topTech) {
    items.push(
      recommendation({
        priority: PRIORITY.LOW,
        title: `Evaluate repository: ${repo.fullName}`,
        evidence: `${repo.rationale} Licence ${repo.licence.spdx ?? "unlicensed"}; maintenance ${repo.maintenance.level}; ${repo.stars} stars.`,
        expectedBenefit: "A candidate implementation for an existing phase, if it fits the stack.",
        estimatedEffort: `${repo.effort.band} — ${repo.effort.note}`,
        confidence: repo.confidence === "high" ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW,
        action: "Read the repository before considering adoption. The Steward did not install or clone it.",
      }),
    )
  }

  if (product && product.available === false) {
    items.push(
      recommendation({
        priority: PRIORITY.MEDIUM,
        title: "Connect an aggregated product data source",
        evidence: product.reason,
        expectedBenefit: "Enables evidence-based product intelligence instead of a stated gap.",
        estimatedEffort: "Requires a design decision and an aggregate view; not a Steward change alone.",
        confidence: CONFIDENCE.HIGH,
        action: "Decide whether to add an anonymised aggregate source; until then this section reports its limitation.",
      }),
    )
  }

  if (legal?.unavailableSources?.length) {
    items.push(
      recommendation({
        priority: PRIORITY.LOW,
        title: `Confirm coverage for ${legal.unavailableSources.length} unreachable legal source(s)`,
        evidence: legal.unavailableSources
          .slice(0, 3)
          .map((source) => `${source.name}: ${source.reason}`)
          .join("; "),
        expectedBenefit: "Confirms the legal monitor sees the sources it claims to cover.",
        estimatedEffort: "Check from a network with unrestricted DNS; adjust the source list if needed.",
        confidence: CONFIDENCE.HIGH,
        action: "Run the Steward from CI and compare which sources become reachable.",
      }),
    )
  }

  return sortRecommendations(items)
}

/** Build the complete report object. */
export function buildReport(sections, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const recommendations = deriveRecommendations(sections)

  const criticalCount = recommendations.filter((item) => item.priority === PRIORITY.CRITICAL).length
  const highCount = recommendations.filter((item) => item.priority === PRIORITY.HIGH).length

  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    stewardVersion: options.stewardVersion ?? "1.0.0",
    generatedAt: now,
    executionMode: options.executionMode ?? "manual",
    trigger: options.trigger ?? "unknown",
    runId: options.runId ?? null,
    // Stated up front so no reader can mistake the scope of the run.
    mode: "READ_ONLY",
    writeOperationsPerformed: false,

    executiveSummary: {
      overallHealth: sections.health?.overall ?? "unknown",
      deployedRevision: sections.health?.health?.revision ?? null,
      mainRevision: sections.health?.mainCommit?.sha ?? null,
      legalSourcesRead: (sections.legal?.sources ?? []).filter((source) => source.reachable).length,
      legalSourcesUnavailable: sections.legal?.unavailableSources?.length ?? 0,
      enactedFindings: sections.legal?.enactedFindings?.length ?? 0,
      relevantFindings: sections.legal?.relevantFindings?.length ?? 0,
      technologyRecommendations: sections.technology?.recommendations?.length ?? 0,
      productDataAvailable: sections.product?.available ?? false,
      forumDrafts: sections.forum?.draftCount ?? 0,
      recommendationsTotal: recommendations.length,
      recommendationsCritical: criticalCount,
      recommendationsHigh: highCount,
    },

    sections: {
      platformHealth: sections.health ?? null,
      errorsAndRisks: {
        healthFindings: (sections.health?.findings ?? []).filter((finding) => finding.severity !== "ok"),
        unavailableSources: sections.legal?.unavailableSources ?? [],
        partialSections: [
          sections.technology?.available === false
            ? { section: "githubTechnologyIntelligence", reason: sections.technology.reason }
            : null,
          sections.product?.available === false
            ? { section: "productIntelligence", reason: sections.product.reason }
            : null,
        ].filter(Boolean),
      },
      germanLegalUpdates: sections.legal ?? null,
      githubTechnology: sections.technology ?? null,
      productIntelligence: sections.product ?? null,
      forumDrafts: sections.forum ?? null,
    },

    recommendedActions: recommendations,

    // The separation the task requires: what was observed, what was assumed,
    // and what is advised are three lists, not one blended narrative.
    verifiedFacts: options.verifiedFacts ?? [],
    assumptions: options.assumptions ?? [],
    sources: buildSourceIndex(sections),
    execution: {
      startedAt: options.startedAt ?? null,
      finishedAt: now,
      durationMs: options.durationMs ?? null,
      nodeVersion: options.nodeVersion ?? null,
      environment: options.environment ?? null,
    },
  }

  return redactDeep(report, { env: options.env ?? {}, secrets: options.secrets ?? [] })
}

/** Collect every source touched, so the report can be audited back to origin. */
export function buildSourceIndex(sections) {
  const sources = []

  if (sections.health?.health?.reachable) {
    sources.push({
      kind: "health_endpoint",
      url: sections.health.health.url ?? "https://vzgplattform.onrender.com/api/health",
      note: `Reported revision ${sections.health.health.revision ?? "unknown"}`,
    })
  }

  for (const source of sections.legal?.sources ?? []) {
    // An unreachable configured source is listed once, in the unavailable block
    // below; listing it here as well would show the same gap twice.
    if (!source.reachable) continue
    sources.push({
      kind: "legal_source",
      id: source.sourceId,
      name: source.name,
      url: source.url,
      reachable: source.reachable,
      status: source.status,
      itemCount: source.itemCount,
      error: source.error,
    })
  }

  for (const source of sections.legal?.unavailableSources ?? []) {
    sources.push({ kind: "legal_source_unavailable", id: source.id, name: source.name, url: source.url, error: source.reason })
  }

  sources.push({
    kind: "github_api",
    url: "https://api.github.com",
    note: sections.technology?.available
      ? `${sections.technology.recommendations.length} repositories assessed across ${sections.technology.topics.length} topics`
      : sections.technology?.reason ?? "not read",
  })

  return sources
}

const STATUS_MARK = {
  enacted_and_promulgated: "ENACTED LAW",
  enacted_not_yet_in_force: "ENACTED (not yet in force)",
  parliamentary_process: "IN PROCESS — not law",
  government_proposal: "PROPOSAL — not law",
  announcement: "ANNOUNCEMENT — not law",
  unknown: "STATUS UNKNOWN",
}

function markdownFinding(finding) {
  const mark = STATUS_MARK[finding.status] ?? STATUS_MARK.unknown
  const lines = [
    `- **[${mark}]** ${finding.title}`,
    `  - Source: ${finding.sourceName}`,
    finding.publishedAt ? `  - Published: ${finding.publishedAt.slice(0, 10)}` : null,
    finding.matchedTerms.length ? `  - Matched: ${finding.matchedTerms.slice(0, 8).join(", ")}` : null,
    finding.link ? `  - Link: ${finding.link}` : null,
    `  - ${finding.caveat}`,
  ]
  return lines.filter(Boolean).join("\n")
}

function markdownRecommendation(item, index) {
  return [
    `${index + 1}. **[${item.priority}]** ${item.title}`,
    `   - Evidence: ${item.evidence}`,
    `   - Expected benefit: ${item.expectedBenefit}`,
    `   - Estimated effort: ${item.estimatedEffort}`,
    `   - Confidence: ${item.confidence}`,
    `   - Action: ${item.action}`,
  ].join("\n")
}

/**
 * Render the report as Markdown.
 *
 * Sections that had no data say so explicitly. An empty section reads as "there
 * was nothing to report", which for product intelligence would be a false claim.
 */
export function renderMarkdown(report) {
  const s = report.sections
  const summary = report.executiveSummary
  const out = []

  out.push("# HORIZON System Steward — Report")
  out.push("")
  out.push(`- Generated: ${report.generatedAt}`)
  out.push(`- Execution mode: **${report.executionMode}** (trigger: ${report.trigger})`)
  out.push(`- Steward version: ${report.stewardVersion} (schema ${report.schemaVersion})`)
  out.push(`- Mode: **${report.mode}** — write operations performed: **${report.writeOperationsPerformed}**`)
  out.push("")

  out.push("## 1. Executive Summary")
  out.push("")
  out.push(`- Overall platform health: **${summary.overallHealth}**`)
  out.push(`- Deployed revision: \`${summary.deployedRevision ?? "unknown"}\``)
  out.push(`- main revision: \`${summary.mainRevision ?? "unknown"}\``)
  out.push(`- Legal sources read: ${summary.legalSourcesRead} (unavailable: ${summary.legalSourcesUnavailable})`)
  out.push(`- Enacted legal findings: ${summary.enactedFindings}; relevant findings: ${summary.relevantFindings}`)
  out.push(`- Technology recommendations: ${summary.technologyRecommendations}`)
  out.push(`- Product data available: ${summary.productDataAvailable}`)
  out.push(`- Forum drafts: ${summary.forumDrafts}`)
  out.push(
    `- Recommendations: ${summary.recommendationsTotal} (Critical: ${summary.recommendationsCritical}, High: ${summary.recommendationsHigh})`,
  )
  out.push("")

  out.push("## 2. Platform Health")
  out.push("")
  if (s.platformHealth) {
    out.push(`- Health endpoint reachable: ${s.platformHealth.health.reachable}`)
    out.push(`- Service status: ${s.platformHealth.health.serviceStatus ?? "unknown"}`)
    out.push(`- Deployed revision: \`${s.platformHealth.health.revision ?? "unknown"}\``)
    out.push(`- main revision: \`${s.platformHealth.mainCommit.shortSha ?? "unknown"}\``)
    if (s.platformHealth.workflows?.available) {
      out.push(
        `- Workflows: ${s.platformHealth.workflows.latestByWorkflow.length} tracked, ${s.platformHealth.workflows.failedRuns.length} failing`,
      )
    } else {
      out.push(`- Workflows: not read — ${s.platformHealth.workflows?.reason ?? "unavailable"}`)
    }
    out.push("")
    out.push("| Severity | Code | Detail |")
    out.push("| --- | --- | --- |")
    for (const finding of s.platformHealth.findings) {
      out.push(`| ${finding.severity} | ${finding.code} | ${String(finding.detail).replace(/\|/g, "\\|")} |`)
    }
  } else {
    out.push("_Platform health was not collected in this run._")
  }
  out.push("")

  out.push("## 3. Errors and Risks")
  out.push("")
  const risks = s.errorsAndRisks
  if (risks.healthFindings.length === 0) out.push("- No non-OK platform findings.")
  for (const finding of risks.healthFindings) out.push(`- [${finding.severity}] ${finding.code}: ${finding.detail}`)
  if (risks.partialSections.length > 0) {
    out.push("")
    out.push("Sections that could not be fully produced:")
    for (const partial of risks.partialSections) out.push(`- **${partial.section}**: ${partial.reason}`)
  }
  out.push("")

  out.push("## 4. German Legal Updates")
  out.push("")
  const legal = s.germanLegalUpdates
  if (legal) {
    out.push(`Read ${legal.sources.filter((source) => source.reachable).length} source(s).`)
    out.push("")
    out.push("### Enacted and promulgated")
    const enacted = legal.enactedFindings.filter((finding) => finding.relevant)
    if (enacted.length === 0) out.push("_No enacted change matched HORIZON terms in this run._")
    for (const finding of enacted) out.push(markdownFinding(finding))
    out.push("")
    out.push("### In process or announced — not law")
    const process = legal.relevantFindings.filter((finding) => !finding.isEnactedLaw)
    if (process.length === 0) out.push("_Nothing relevant in process._")
    for (const finding of process) out.push(markdownFinding(finding))
    out.push("")
    out.push("### Unavailable sources")
    if (legal.unavailableSources.length === 0) out.push("_All configured sources were read._")
    for (const source of legal.unavailableSources) {
      out.push(`- ${source.name} — ${source.reason} (${source.url})`)
    }
  } else {
    out.push("_Legal monitoring was not collected in this run._")
  }
  out.push("")

  out.push("## 5. GitHub Technology Opportunities")
  out.push("")
  if (s.githubTechnology?.available) {
    out.push(`${s.githubTechnology.recommendations.length} repository recommendation(s).`)
    out.push("")
    for (const repo of s.githubTechnology.recommendations.slice(0, 15)) {
      out.push(`- **${repo.fullName}** (${repo.stars}★) — ${repo.url}`)
      out.push(`  - Why: ${repo.rationale}`)
      out.push(
        `  - Licence: ${repo.licence.spdx ?? "none detected"} (${repo.licence.commercialUse}) — ${repo.licence.note}`,
      )
      out.push(`  - Maintenance: ${repo.maintenance.level} — ${repo.maintenance.note}`)
      out.push(`  - Security signals: ${repo.securitySignals.map((signal) => `${signal.level}: ${signal.note}`).join("; ")}`)
      out.push(`  - Effort: ${repo.effort.band} — ${repo.effort.note}`)
    }
    out.push("")
    out.push("_Recommendations only. Nothing was installed, cloned or adopted._")
  } else {
    out.push(`_Technology search not performed: ${s.githubTechnology?.reason ?? "unavailable"}_`)
  }
  out.push("")

  out.push("## 6. Product Improvement Opportunities")
  out.push("")
  if (s.productIntelligence?.available) {
    for (const finding of s.productIntelligence.findings) out.push(`- ${finding}`)
  } else {
    out.push(`**No product metrics are reported.** ${s.productIntelligence?.reason ?? "No source available."}`)
    out.push("")
    out.push("What would unblock this section:")
    for (const item of s.productIntelligence?.whatWouldUnblock ?? []) {
      out.push(`- **${item.name}** → ${item.wouldEnable}`)
    }
  }
  out.push("")

  out.push("## 7. Forum Drafts")
  out.push("")
  if (s.forumDrafts?.draftCount > 0) {
    out.push(`${s.forumDrafts.draftCount} draft(s). **All require human review. Nothing is published.**`)
    out.push("")
    for (const draft of s.forumDrafts.drafts) {
      out.push(`### ${draft.title}`)
      out.push("")
      out.push(`- Topic: \`${draft.topic}\` · Status: \`${draft.status}\` · Publishable: \`${draft.publishable}\``)
      out.push("")
      out.push("```text")
      out.push(draft.body)
      out.push("```")
      out.push("")
    }
  } else {
    out.push("_No forum drafts were produced (no verified finding with a source link)._")
  }
  out.push("")

  out.push("## 8. Recommended Actions")
  out.push("")
  if (report.recommendedActions.length === 0) {
    out.push("_No recommendations._")
  } else {
    for (const [index, item] of report.recommendedActions.entries()) {
      out.push(markdownRecommendation(item, index))
    }
  }
  out.push("")

  out.push("## 9. Sources and Evidence")
  out.push("")
  out.push("| Kind | Source | Reachable | Note |")
  out.push("| --- | --- | --- | --- |")
  for (const source of report.sources) {
    const label = source.name ?? source.id ?? source.url
    const note = source.error ?? source.note ?? (source.itemCount != null ? `${source.itemCount} item(s)` : "")
    out.push(`| ${source.kind} | ${label} | ${source.reachable ?? "—"} | ${String(note).replace(/\|/g, "\\|")} |`)
  }
  out.push("")

  if (report.verifiedFacts.length > 0 || report.assumptions.length > 0) {
    out.push("### Verified facts")
    if (report.verifiedFacts.length === 0) out.push("_None recorded._")
    for (const fact of report.verifiedFacts) out.push(`- ${fact}`)
    out.push("")
    out.push("### Assumptions")
    if (report.assumptions.length === 0) out.push("_None recorded._")
    for (const assumption of report.assumptions) out.push(`- ${assumption}`)
    out.push("")
  }

  out.push("## 10. Execution")
  out.push("")
  out.push(`- Started: ${report.execution.startedAt ?? "unknown"}`)
  out.push(`- Finished: ${report.execution.finishedAt}`)
  out.push(`- Duration: ${report.execution.durationMs ?? "unknown"} ms`)
  out.push(`- Node: ${report.execution.nodeVersion ?? "unknown"}`)
  out.push(`- Environment: ${report.execution.environment ?? "unknown"}`)
  out.push(`- Run ID: ${report.runId ?? "not provided"}`)
  out.push("")

  return out.join("\n")
}

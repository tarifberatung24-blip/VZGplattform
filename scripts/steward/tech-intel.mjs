/**
 * GitHub technology intelligence for the HORIZON System Steward.
 *
 * Finds repositories that could plausibly improve HORIZON and reports an
 * assessment. It is deliberately *recommendation only*: it does not install,
 * clone into the project, modify the architecture, or open pull requests. The
 * value of this section is a short list a human can act on, not a list of every
 * match.
 *
 * Licence and maintenance are reported as facts (SPDX id, last push, stars,
 * archived flag). Security is reported as *signals* — archived, stale, no
 * licence, low activity — not as a vulnerability verdict, because a real
 * vulnerability check needs a dependency graph the Steward does not have. Saying
 * "no known vulnerabilities" from a repository listing would be a guess.
 */

import { stewardFetch } from "./guard.mjs"

/**
 * Search topics tied to HORIZON's actual stack and domain. Each carries the
 * reason it is worth watching, so a reader can judge relevance without opening
 * the repository.
 *
 * Each topic holds a *list* of queries that are run separately. GitHub's
 * repository search rejects the `OR` operator (`Validation Failed`), and a bare
 * free-text term such as "elster" matches thousands of unrelated repositories,
 * so precision comes from topic-scoped queries run one at a time and merged.
 */
export const TECH_TOPICS = [
  {
    id: "german-tax-elster",
    queries: ["topic:elster", "topic:elster-api", "topic:steuererklarung"],
    rationale: "P15 Steuererklärung and the ELSTER review package.",
  },
  {
    id: "e-invoicing-germany",
    queries: ["topic:e-invoicing", "topic:erechnung", "topic:zugferd"],
    rationale: "Invoice handling for self-employed users and small businesses.",
  },
  {
    id: "german-official-forms",
    queries: ["topic:pdf-forms", "topic:acroform", "topic:pdf-filling"],
    rationale: "P9 official PDF form engine.",
  },
  {
    id: "document-ocr",
    queries: ["topic:ocr", "topic:document-extraction"],
    rationale: "P6 document intake, OCR and explanation.",
  },
  {
    id: "ai-guardrails",
    queries: ["topic:llm-guardrails", "topic:ai-safety", "topic:ai-evaluation"],
    rationale: "P7 assistant rails and the Alpha Team quality gate.",
  },
  {
    id: "supabase-rls",
    queries: ["topic:supabase", "topic:row-level-security"],
    rationale: "Owner-scoped case model and RLS isolation.",
  },
]

/**
 * Minimum stars for a repository to be presented as a recommendation.
 *
 * The Steward's value is a short, actionable list. A repository with no adoption
 * is not a recommendation, it is a coincidence of naming, so it is filtered out
 * and counted instead of shown.
 */
export const MIN_STARS_FOR_RECOMMENDATION = 5

/** Licences compatible with commercial use, and the ones that are not. */
export const PERMISSIVE_LICENCES = [
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Unlicense", "MPL-2.0",
]

export const COPYLEFT_LICENCES = [
  "GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0", "SSPL-1.0", "EUPL-1.1", "EUPL-1.2",
]

const DAY_MS = 86_400_000

/** Classify a licence for commercial use, stating the basis. */
export function assessLicence(spdxId) {
  if (!spdxId) {
    return {
      spdx: null,
      commercialUse: "unknown",
      note: "No licence detected. Absence of a licence is not permission to use the code.",
    }
  }
  if (PERMISSIVE_LICENCES.includes(spdxId)) {
    return { spdx: spdxId, commercialUse: "permitted", note: `${spdxId} permits commercial use.` }
  }
  if (COPYLEFT_LICENCES.includes(spdxId)) {
    return {
      spdx: spdxId,
      commercialUse: "restricted",
      note: `${spdxId} is copyleft. Commercial use is possible but carries obligations; review before adopting.`,
    }
  }
  return { spdx: spdxId, commercialUse: "review", note: `${spdxId} was not classified; review the terms.` }
}

/** Maintenance activity from the last push, with the threshold stated. */
export function assessMaintenance(repo, now = Date.now()) {
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : null
  if (pushedAt === null || Number.isNaN(pushedAt)) {
    return { level: "unknown", daysSincePush: null, note: "Last push date unavailable." }
  }
  const days = Math.floor((now - pushedAt) / DAY_MS)
  if (repo.archived) {
    return { level: "archived", daysSincePush: days, note: "Repository is archived and receives no updates." }
  }
  if (days <= 90) return { level: "active", daysSincePush: days, note: `Pushed ${days} day(s) ago.` }
  if (days <= 365) return { level: "slowing", daysSincePush: days, note: `Last push ${days} day(s) ago.` }
  return { level: "stale", daysSincePush: days, note: `Last push ${days} day(s) ago; may be abandoned.` }
}

/**
 * Security signals derivable from repository metadata. Named `signals` on
 * purpose: these are reasons to look closer, not a vulnerability report.
 */
export function securitySignals(repo, licence, maintenance) {
  const signals = []
  if (repo.archived) signals.push({ level: "high", note: "Archived repository: no security fixes will arrive." })
  if (!licence.spdx) signals.push({ level: "medium", note: "No licence: provenance and use terms are unclear." })
  if (licence.commercialUse === "restricted") {
    signals.push({ level: "medium", note: `Licence ${licence.spdx} imposes obligations on commercial use.` })
  }
  if (maintenance.level === "stale") signals.push({ level: "medium", note: "No push in over a year." })
  if (repo.open_issues_count > 500) {
    signals.push({ level: "low", note: `${repo.open_issues_count} open issues suggests a large backlog.` })
  }
  if (signals.length === 0) signals.push({ level: "none", note: "No metadata-level risk signal detected." })
  return signals
}

/** Estimated effort from repository size, stated as a band with its basis. */
export function estimateEffort(repo) {
  const sizeKb = repo.size ?? 0
  if (sizeKb < 500) return { band: "low", note: "Small repository; likely a focused library or a wrapper." }
  if (sizeKb < 10_000) return { band: "medium", note: "Moderate repository; integration needs a design pass." }
  return { band: "high", note: "Large repository; adopting it is a project, not a task." }
}

/** Turn a GitHub search result into an assessed recommendation. */
export function assessRepository(repo, topic, now = Date.now()) {
  const licence = assessLicence(repo.license?.spdx_id ?? null)
  const maintenance = assessMaintenance(repo, now)
  const security = securitySignals(repo, licence, maintenance)
  const effort = estimateEffort(repo)

  const risks = security.filter((signal) => signal.level !== "none").length
  const confidence = maintenance.level === "unknown" ? "low" : risks === 0 ? "high" : "medium"

  return {
    topicId: topic.id,
    rationale: topic.rationale,
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description ?? null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    language: repo.language ?? null,
    topics: repo.topics ?? [],
    licence,
    maintenance,
    securitySignals: security,
    effort,
    archived: Boolean(repo.archived),
    pushedAt: repo.pushed_at ?? null,
    // Ranked by signal quality, not popularity alone: a stale, unlicensed
    // repository with many stars is still a poor recommendation.
    recommendationScore:
      (maintenance.level === "active" ? 3 : maintenance.level === "slowing" ? 1 : 0) +
      (licence.commercialUse === "permitted" ? 2 : 0) +
      (risks === 0 ? 1 : 0),
    confidence,
    note: "Recommendation only. Not installed, cloned or adopted by the Steward.",
  }
}

/** Search GitHub for repositories matching the configured topics. */
export async function collectTechnologyIntelligence(options = {}) {
  const token = options.token
  const topics = options.topics ?? TECH_TOPICS

  if (!token) {
    return {
      available: false,
      reason: "GITHUB_TOKEN is not available; technology search was not performed",
      topics: [],
      recommendations: [],
    }
  }

  const perQuery = options.perQuery ?? 5
  const minStars = options.minStars ?? MIN_STARS_FOR_RECOMMENDATION
  const results = []
  const recommendations = []
  const seenRepos = new Set()
  let filteredForLowAdoption = 0

  for (const topic of topics) {
    const queries = topic.queries ?? (topic.query ? [topic.query] : [])
    const topicResult = {
      topicId: topic.id,
      rationale: topic.rationale,
      queries: [],
      ok: false,
      error: null,
      count: 0,
      matched: 0,
    }

    for (const query of queries) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perQuery}`
      const response = await stewardFetch(url, {
        json: true,
        timeoutMs: options.timeoutMs ?? 20_000,
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      })

      if (!response.ok || !response.data) {
        topicResult.queries.push({ query, ok: false, error: response.error, count: 0 })
        continue
      }

      const items = Array.isArray(response.data.items) ? response.data.items : []
      const kept = items.filter((repo) => (repo.stargazers_count ?? 0) >= minStars)
      filteredForLowAdoption += items.length - kept.length

      topicResult.queries.push({ query, ok: true, error: null, count: kept.length, matched: items.length })
      topicResult.ok = true
      topicResult.matched += items.length
      topicResult.count += kept.length

      for (const repo of kept) {
        // A repository can carry several topics; report it once, under the first
        // topic that matched it, so the list has no duplicates.
        if (seenRepos.has(repo.full_name)) continue
        seenRepos.add(repo.full_name)
        recommendations.push(assessRepository(repo, topic))
      }
    }

    if (!topicResult.ok) {
      topicResult.error = topicResult.queries.map((q) => q.error).filter(Boolean)[0] ?? "all queries failed"
    }
    results.push(topicResult)
  }

  recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore)

  return {
    available: true,
    reason: null,
    topics: results,
    recommendations,
    failedTopics: results.filter((result) => !result.ok),
    filteredForLowAdoption,
    minStarsForRecommendation: minStars,
  }
}

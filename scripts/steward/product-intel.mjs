/**
 * Product intelligence and forum drafts for the HORIZON System Steward.
 *
 * Two sections that are deliberately thin in V1, for the same reason: both need
 * a data source that does not exist yet, and inventing one would be worse than
 * reporting the gap.
 *
 * Product intelligence needs *aggregated, anonymised* usage data. HORIZON stores
 * per-owner cases behind RLS, and the Steward is forbidden from reading
 * individual customer documents. There is no aggregate table and no analytics
 * pipeline, so this section reports the limitation instead of producing numbers.
 * A fabricated "top user need" would be indistinguishable from a real one in the
 * report, which is exactly the failure the governance rules forbid.
 *
 * Forum drafts are generated from *verified legal findings only*. The Steward
 * inspects the forum's shape (official topics, length limits, the rules text) so
 * a draft is valid for the composer, but every draft is explicitly marked as
 * requiring human review. Nothing here publishes.
 */

import { FORUM_OFFICIAL_TOPICS, FORUM_LIMITS } from "./forum-contract.mjs"

/**
 * Data sources that would be needed for real product intelligence, and their
 * current status. Naming them turns "no data" into a concrete next step.
 */
export const PRODUCT_DATA_SOURCES = [
  {
    id: "aggregate_case_outcomes",
    name: "Aggregated, anonymised case outcomes",
    status: "not_available",
    detail:
      "Cases are owner-scoped behind RLS and no aggregate view exists. Reading them individually is outside the Steward's authority.",
    wouldEnable: "Which case types recur, where users get stuck, which steps take longest.",
  },
  {
    id: "usage_analytics",
    name: "Product usage analytics",
    status: "not_available",
    detail:
      "No analytics pipeline or event store is configured in the repository. Affiliate click attribution exists but covers partner handoffs only, not product journeys.",
    wouldEnable: "Feature adoption, drop-off points, workflow bottlenecks.",
  },
  {
    id: "support_requests",
    name: "Aggregated support and feedback requests",
    status: "partial",
    detail:
      "The forum has a 'feedback' category, but reading it requires a database read the Steward does not perform in V1. Only its schema is inspected here.",
    wouldEnable: "Repeated user needs and unresolved problems, stated by users themselves.",
  },
  {
    id: "affiliate_analytics",
    name: "Affiliate network attribution",
    status: "available_but_owner_scoped",
    detail:
      "Awin reconciliation stores partner transactions. It reports commercial outcomes, not product friction, and is accessed through an authenticated cron route rather than read directly.",
    wouldEnable: "Which contract categories users actually act on.",
  },
]

/**
 * Report the product-intelligence limitation explicitly.
 *
 * The output is a structured statement of what is missing and what would make
 * each source usable. It contains no metrics, because none were available.
 */
export function collectProductIntelligence(options = {}) {
  const sources = options.sources ?? PRODUCT_DATA_SOURCES
  const available = sources.filter((source) => source.status === "available")
  const partial = sources.filter((source) => source.status === "partial")

  return {
    available: false,
    // A section that cannot produce findings says so, rather than emitting an
    // empty list that a reader could mistake for "no problems found".
    reason:
      "No aggregated, anonymised product data source is connected. HORIZON cases are owner-scoped behind RLS and the Steward is read-only with no authority to read individual customer documents, so no product metrics are reported.",
    findings: [],
    metricsReported: 0,
    dataSources: sources,
    availableSources: available.length,
    partialSources: partial.length,
    whatWouldUnblock: sources.map((source) => ({
      id: source.id,
      name: source.name,
      wouldEnable: source.wouldEnable,
    })),
    note: "No product metrics were invented to fill this section.",
  }
}

/** Forum topic to use for a legal finding, based on what the finding is. */
export function forumTopicForFinding(finding) {
  if (finding.isEnactedLaw) return "law"
  if (finding.status === "parliamentary_process" || finding.status === "government_proposal") {
    return "platform"
  }
  return "platform"
}

/** Trim text to a forum field limit on a word boundary where possible. */
function clamp(text, max) {
  const value = String(text ?? "").trim()
  if (value.length <= max) return value
  const cut = value.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * Draft one German forum post from a verified legal finding.
 *
 * The draft states the finding's *status* in the body, so a reader cannot read a
 * bill as a law even if they skip the metadata. It carries a source link and a
 * review banner, and it is returned as a draft object — there is no code path
 * here that publishes it.
 */
export function draftForumPost(finding, options = {}) {
  const topic = options.topic ?? forumTopicForFinding(finding)
  const statusLine = finding.isEnactedLaw
    ? "Veröffentlicht im Bundesgesetzblatt — es handelt sich um einen verkündeten Rechtstext."
    : "Wichtig: Das ist noch kein geltendes Gesetz. Es handelt sich um ein laufendes Verfahren bzw. eine Ankündigung."

  const title = clamp(`Neuerung im Blick: ${finding.title}`, FORUM_LIMITS.titleMax)

  const body = [
    "**Entwurf zur Prüfung — nicht veröffentlicht.**",
    "",
    `Wir haben eine neue Veröffentlichung aus offizieller Quelle erfasst: **${finding.title}**.`,
    "",
    statusLine,
    "",
    finding.matchedTerms.length > 0
      ? `Betroffene Themen: ${finding.matchedTerms.slice(0, 8).join(", ")}.`
      : "Eine direkte Zuordnung zu einem HORIZON-Modul wurde noch nicht vorgenommen.",
    "",
    finding.link ? `Quelle: ${finding.link}` : "Quelle: Link in der Originalmeldung.",
    finding.publishedAt ? `Veröffentlichungsdatum: ${finding.publishedAt.slice(0, 10)}.` : "",
    "",
    "Was das für HORIZON bedeuten kann:",
    "- Prüfen, ob ein bestehendes Modul oder Formular angepasst werden muss.",
    "- Prüfen, ob Nutzer betroffen sind, die bereits einen Fall zu diesem Thema haben.",
    "",
    "Hinweis: Diese Zusammenfassung ist eine Orientierung, keine Rechtsberatung. Maßgeblich ist der amtliche Text.",
  ]
    .filter((line) => line !== "")
    .join("\n")

  return {
    kind: "forum_post",
    topic,
    title,
    body: clamp(body, FORUM_LIMITS.bodyMax),
    status: "draft_requires_human_review",
    sourceFinding: {
      title: finding.title,
      link: finding.link,
      status: finding.status,
      publishedAt: finding.publishedAt,
    },
    publishable: false,
    note: "Draft only. The Steward has no authority to publish forum content.",
  }
}

/**
 * Draft a German discussion topic, for when a finding is process rather than law
 * and the useful action is to invite informed discussion.
 */
export function draftDiscussionTopic(finding, options = {}) {
  const title = clamp(`Diskussion: ${finding.title}`, FORUM_LIMITS.titleMax)
  const body = [
    "**Entwurf zur Prüfung — nicht veröffentlicht.**",
    "",
    `Möchten wir das Thema **${finding.title}** im Forum aufgreifen?`,
    "",
    "Ausgangslage:",
    finding.statusLabel,
    "",
    "Leitfragen für die Diskussion:",
    "- Wen betrifft das konkret — Privatpersonen, Selbstständige, Unternehmen?",
    "- Welche HORIZON-Funktion könnte eine Anpassung brauchen?",
    "- Gibt es dazu bereits verlässliche offizielle Informationen?",
    "",
    finding.link ? `Quelle: ${finding.link}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n")

  return {
    kind: "discussion_topic",
    topic: options.topic ?? "platform",
    title,
    body: clamp(body, FORUM_LIMITS.bodyMax),
    status: "draft_requires_human_review",
    sourceFinding: { title: finding.title, link: finding.link, status: finding.status },
    publishable: false,
    note: "Draft only. The Steward has no authority to publish forum content.",
  }
}

/**
 * Produce forum drafts from verified findings.
 *
 * Only findings backed by an official source are drafted. A finding with no link
 * is skipped, because a forum post that cannot cite its source should not be
 * written. The count of drafts is capped so the section stays reviewable.
 */
export function buildForumDrafts(findings, options = {}) {
  const limit = options.limit ?? 5
  const drafts = []

  for (const finding of findings) {
    if (drafts.length >= limit) break
    if (!finding.link) continue
    drafts.push(
      finding.isEnactedLaw ? draftForumPost(finding, options) : draftDiscussionTopic(finding, options),
    )
  }

  return {
    drafts,
    draftCount: drafts.length,
    requiresHumanReview: true,
    publishable: false,
    officialTopics: FORUM_OFFICIAL_TOPICS,
    note:
      "All forum content is a draft for human review. The Steward cannot publish. Drafts are generated only from findings that carry an official source link.",
  }
}

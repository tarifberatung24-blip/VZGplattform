/**
 * German legal and regulatory monitor for the HORIZON System Steward.
 *
 * The hard problem here is not fetching. It is that a reader must never mistake a
 * proposal for a law. German legislative material comes in several grades, and
 * the same subject appears at every grade: a draft in a ministry, a cabinet
 * decision, a Bundestag bill, a passed law, a promulgated law, a law in force.
 *
 * So every source is assigned a `status` that reflects what publishing there
 * *means*, and that status is attached to the finding. A Bundesgesetzblatt entry
 * is a promulgated law; a Bundestag press release is not. The monitor never
 * infers status from the wording of a title, because titles do not carry it.
 *
 * `SOURCE_REACHABILITY` records what this environment could actually read. A
 * source that could not be read is reported as unavailable rather than omitted,
 * so the report never implies coverage it did not have.
 */

import { parseFeed, normalizeDate } from "./xml.mjs"
import { stewardFetch } from "./guard.mjs"

/** What publication on a given source means, in ascending order of authority. */
export const LEGAL_STATUS = {
  ENACTED_AND_PROMULGATED: "enacted_and_promulgated",
  ENACTED_NOT_YET_IN_FORCE: "enacted_not_yet_in_force",
  PARLIAMENTARY_PROCESS: "parliamentary_process",
  GOVERNMENT_PROPOSAL: "government_proposal",
  ANNOUNCEMENT: "announcement",
  UNKNOWN: "unknown",
}

/** Plain-language labels so the report cannot overstate a finding. */
export const LEGAL_STATUS_LABELS = {
  [LEGAL_STATUS.ENACTED_AND_PROMULGATED]: "Enacted and promulgated in the Bundesgesetzblatt",
  [LEGAL_STATUS.ENACTED_NOT_YET_IN_FORCE]: "Enacted; entry into force may be later",
  [LEGAL_STATUS.PARLIAMENTARY_PROCESS]: "In parliamentary process — not a law yet",
  [LEGAL_STATUS.GOVERNMENT_PROPOSAL]: "Government proposal or press release — not a law yet",
  [LEGAL_STATUS.ANNOUNCEMENT]: "Announcement only — not a law yet",
  [LEGAL_STATUS.UNKNOWN]: "Status could not be established from the source",
}

/**
 * Monitored sources. `status` is what a publication there means; it is never
 * derived from the item text.
 */
export const LEGAL_SOURCES = [
  {
    id: "bundesgesetzblatt",
    name: "Bundesgesetzblatt (Verkündungsplattform des Bundes)",
    url: "https://www.recht.bund.de/rss/feeds/rss_bgbl-1-2.xml",
    kind: "feed",
    status: LEGAL_STATUS.ENACTED_AND_PROMULGATED,
    authority: "official",
    note: "Promulgation platform. A publication here is the official, enacted text.",
  },
  {
    id: "gesetze-im-internet",
    name: "Gesetze im Internet — Aktualitätendienst (BMJ)",
    url: "https://www.gesetze-im-internet.de/aktuDienst-rss-feed.xml",
    kind: "feed",
    status: LEGAL_STATUS.ENACTED_AND_PROMULGATED,
    authority: "official",
    note: "Consolidated federal law, kept current by the Bundesamt für Justiz.",
  },
  {
    id: "bmas",
    name: "Bundesministerium für Arbeit und Soziales",
    url: "https://www.bmas.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed.xml",
    kind: "feed",
    status: LEGAL_STATUS.GOVERNMENT_PROPOSAL,
    authority: "official",
    note: "Ministry news. Reports intent and proposals; not a promulgation.",
  },
  {
    id: "bamf",
    name: "Bundesamt für Migration und Flüchtlinge",
    url: "https://www.BAMF.de/SiteGlobals/Functions/RSS/DE/Feed/RSSNewsfeed_Pressemitteilungen.xml",
    kind: "feed",
    status: LEGAL_STATUS.ANNOUNCEMENT,
    authority: "official",
    note: "Press releases. Announcements, not legal texts.",
  },
  {
    id: "bundestag-hib",
    name: "Deutscher Bundestag — Heute im Bundestag",
    url: "https://www.bundestag.de/static/appdata/includes/rss/hib.rss",
    kind: "feed",
    status: LEGAL_STATUS.PARLIAMENTARY_PROCESS,
    authority: "official",
    note: "Legislative procedure reporting. Bills in process are not law.",
  },
  {
    id: "bundestag-themen",
    name: "Deutscher Bundestag — Aktuelle Themen",
    url: "https://www.bundestag.de/static/appdata/includes/rss/aktuellethemen.rss",
    kind: "feed",
    status: LEGAL_STATUS.PARLIAMENTARY_PROCESS,
    authority: "official",
    note: "Parliamentary topics and debates.",
  },
]

/**
 * Sources named in the task that this environment could not read. Recorded so
 * the report states the gap instead of presenting partial coverage as complete.
 * A host unreachable from a restricted sandbox may be reachable in CI.
 */
export const UNVERIFIED_SOURCES = [
  {
    id: "bmi",
    name: "Bundesministerium des Innern",
    url: "https://www.bmi.bund.de/",
    reason: "host did not resolve from the build environment (DNS blocked)",
  },
  {
    id: "bmf",
    name: "Bundesministerium der Finanzen",
    url: "https://www.bundesfinanzministerium.de/",
    reason: "responded 503; no working feed URL was confirmed",
  },
  {
    id: "arbeitsagentur",
    name: "Bundesagentur für Arbeit",
    url: "https://www.arbeitsagentur.de/",
    reason: "no RSS/Atom feed was found at the documented paths",
  },
  {
    id: "eur-lex",
    name: "EUR-Lex (EU official publications)",
    url: "https://eur-lex.europa.eu/",
    reason: "no stable machine-readable feed endpoint was confirmed",
  },
]

/**
 * Terms that make a legal change relevant to HORIZON's users: residents,
 * self-employed people and businesses in Germany.
 *
 * Relevance is a routing signal for a human reader, never a statement about
 * what a law does. A finding that matches nothing is still reported, just lower.
 */
export const RELEVANCE_TERMS = [
  // Tax
  "steuer", "einkommensteuer", "umsatzsteuer", "mehrwertsteuer", "steuererklärung",
  "steuererklarung", "elster", "finanzamt", "abgabe", "abgabenordnung", "solidaritätszuschlag",
  "kindergeld", "kinderfreibetrag", "werbungskosten",
  // Social and employment
  "sozialversicherung", "rentenversicherung", "arbeitslosengeld", "bürgergeld", "burgergeld",
  "jobcenter", "arbeitsagentur", "kurzarbeit", "mindestlohn", "arbeitsrecht", "kündigung",
  "kundigung", "arbeitsvertrag", "sozialgesetzbuch", "beitragsbemessungsgrenze",
  // Health and insurance
  "krankenversicherung", "pflegeversicherung", "gesundheitsversicherung", "unfallversicherung",
  "versicherung", "beitrag",
  // Residency, migration, family
  "aufenthalt", "aufenthaltstitel", "einbürgerung", "einburgerung", "staatsangehörigkeit",
  "migration", "asyl", "flüchtling", "fluchtling", "integration", "familie", "elterngeld",
  // Business and self-employment
  "selbstständig", "selbststandig", "gewerbe", "gewerbeordnung", "unternehmen", "kleinunternehmer",
  "freiberufler", "handelsregister", "gesellschaft", "rechnung", "e-rechnung",
  // Reporting and administration
  "meldepflicht", "berichtspflicht", "bürokratie", "burokratie", "digitalisierung",
  "registermodernisierung", "datenschutz", "identifikationsnummer",
  // Money and credit
  "kredit", "darlehen", "zinsen", "insolvenz", "inkasso", "verbraucher", "preisangaben",
  "energie", "strom", "gas",
]

/**
 * Normalize text for term matching.
 *
 * Umlauts fold to their two-letter German transliteration (`ü` → `ue`) rather
 * than to a bare vowel, because German text writes both forms: a feed may say
 * "bürgergeld" while a term list says "buergergeld". Folding both sides to the
 * same transliteration makes them match, which folding `ü` to `u` would not.
 */
function fold(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
}

/** Terms a finding matches, used to route it to a reader. */
export function matchedTerms(text, terms = RELEVANCE_TERMS) {
  const haystack = fold(text)
  const seen = new Set()
  for (const term of terms) {
    if (haystack.includes(fold(term))) seen.add(term)
  }
  return [...seen]
}

/**
 * Classify one feed item into a finding.
 *
 * `status` comes from the source, never from the title. A Bundesgesetzblatt item
 * whose title contains "Entwurf" is still a promulgated law, and a Bundestag item
 * whose title contains "Gesetz" is still not one — the source decides.
 */
export function classifyFinding(item, source) {
  const text = `${item.title} ${item.summary ?? ""}`.trim()
  const terms = matchedTerms(text)
  return {
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    authority: source.authority,
    status: source.status,
    statusLabel: LEGAL_STATUS_LABELS[source.status] ?? LEGAL_STATUS_LABELS[LEGAL_STATUS.UNKNOWN],
    title: item.title,
    link: item.link || null,
    publishedAt: item.publishedAt ?? normalizeDate(item.pubDate) ?? null,
    matchedTerms: terms,
    relevant: terms.length > 0,
    // The distinction the report must never blur.
    isEnactedLaw: source.status === LEGAL_STATUS.ENACTED_AND_PROMULGATED,
    caveat:
      source.status === LEGAL_STATUS.ENACTED_AND_PROMULGATED
        ? "Published in the official promulgation record."
        : "Not an enacted law. Reported here as process or announcement only.",
  }
}

/** Read one source and return its findings plus a reachability record. */
export async function readSource(source, options = {}) {
  const limit = options.limitPerSource ?? 25
  const response = await stewardFetch(source.url, {
    timeoutMs: options.timeoutMs ?? 15_000,
    headers: { accept: "application/rss+xml, application/xml, text/xml, */*" },
  })

  if (!response.ok) {
    return {
      sourceId: source.id,
      name: source.name,
      url: source.url,
      reachable: false,
      status: source.status,
      error: response.error ?? "unreachable",
      itemCount: 0,
      findings: [],
    }
  }

  const feed = parseFeed(response.body)
  const findings = feed.items
    .slice(0, limit)
    .map((item) => classifyFinding(item, source))
    .filter((finding) => finding.title)

  return {
    sourceId: source.id,
    name: source.name,
    url: source.url,
    reachable: true,
    status: source.status,
    feedFormat: feed.format,
    feedTitle: feed.title,
    error: null,
    itemCount: feed.items.length,
    findings,
  }
}

/**
 * Read every configured source.
 *
 * A source that fails is recorded with `reachable: false` and does not prevent
 * the others from being read, so a partial network still produces a useful,
 * honest report.
 */
export async function collectLegalFindings(options = {}) {
  const sources = options.sources ?? LEGAL_SOURCES
  const results = []
  for (const source of sources) {
    results.push(await readSource(source, options))
  }

  const findings = results.flatMap((result) => result.findings)
  const relevant = findings.filter((finding) => finding.relevant)
  const enacted = findings.filter((finding) => finding.isEnactedLaw)

  return {
    sources: results,
    findings,
    relevantFindings: relevant,
    enactedFindings: enacted,
    unavailableSources: [
      ...results
        .filter((result) => !result.reachable)
        .map((result) => ({
          id: result.sourceId,
          name: result.name,
          url: result.url,
          reason: result.error,
        })),
      ...UNVERIFIED_SOURCES,
    ],
  }
}

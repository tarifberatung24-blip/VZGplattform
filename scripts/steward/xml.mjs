/**
 * Dependency-free feed parser for the HORIZON System Steward.
 *
 * The Steward reads RSS 2.0 and Atom feeds from government sites. Adding an XML
 * library would mean a new runtime dependency for a tool that runs on a schedule
 * and needs to keep working unattended, so this parses the narrow subset those
 * feeds actually use: a channel of items, each with a title, a link and a date.
 *
 * The parser never throws. A government feed that changes shape should degrade a
 * single section of the report, not abort the run, so malformed input yields the
 * items it could recover and the caller decides what to do with an empty result.
 */

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "\u2013",
  mdash: "\u2014",
  szlig: "\u00df",
  auml: "\u00e4",
  ouml: "\u00f6",
  uuml: "\u00fc",
  Auml: "\u00c4",
  Ouml: "\u00d6",
  Uuml: "\u00dc",
  euro: "\u20ac",
}

/** Decode the XML entities that appear in German government feeds. */
export function decodeEntities(input) {
  if (typeof input !== "string") return ""
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, entity) ? ENTITIES[entity] : match
  })
}

/** Remove markup and collapse whitespace, leaving readable text. */
export function stripTags(input) {
  if (typeof input !== "string") return ""
  return decodeEntities(
    input
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
}

/** Read the text of the first `<tag>` inside `block`, or "" when absent. */
function tagText(block, tag) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i")
  const match = block.match(pattern)
  return match ? stripTags(match[1]) : ""
}

/** Read an attribute of the first `<tag ...>` inside `block`, or "" when absent. */
function tagAttribute(block, tag, attribute) {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\b${attribute}\\s*=\\s*["']([^"']*)["'][^>]*>`, "i")
  const match = block.match(pattern)
  return match ? decodeEntities(match[1]).trim() : ""
}

/** Extract the top-level blocks for a given element name. */
function extractBlocks(xml, element) {
  const pattern = new RegExp(`<${element}(?:\\s[^>]*)?>([\\s\\S]*?)</${element}>`, "gi")
  const blocks = []
  let match
  while ((match = pattern.exec(xml)) !== null) blocks.push(match[1])
  return blocks
}

/** Normalize a feed date to an ISO date string, or null when unparseable. */
export function normalizeDate(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null
  const value = raw.trim()

  // German feeds sometimes use DD.MM.YYYY, which `new Date` reads as month-first.
  // The components are range-checked first: `Date` silently rolls an impossible
  // date over (32.13.2026 becomes 2027-02-01), which would put a wrong date in
  // the report instead of flagging the input as unreadable.
  const german = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (german) {
    const day = Number(german[1])
    const month = Number(german[2])
    const year = Number(german[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const iso = new Date(Date.UTC(year, month - 1, day))
    // Reject a roll-over such as 31.02, where the constructed month differs.
    if (iso.getUTCMonth() !== month - 1 || iso.getUTCDate() !== day) return null
    return iso.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseRssItem(block) {
  const link = tagText(block, "link") || tagAttribute(block, "link", "href")
  return {
    id: tagText(block, "guid") || link,
    title: tagText(block, "title"),
    link,
    publishedAt: normalizeDate(tagText(block, "pubDate") || tagText(block, "dc:date")),
    summary: tagText(block, "description").slice(0, 600),
    category: tagText(block, "category"),
  }
}

function parseAtomEntry(block) {
  const link = tagAttribute(block, "link", "href")
  return {
    id: tagText(block, "id") || link,
    title: tagText(block, "title"),
    link,
    publishedAt: normalizeDate(tagText(block, "updated") || tagText(block, "published")),
    summary: tagText(block, "summary").slice(0, 600),
    category: tagAttribute(block, "category", "term"),
  }
}

/**
 * Parse an RSS 2.0 or Atom document.
 *
 * Returns `{ format, title, items }`. `format` is `"rss"`, `"atom"` or
 * `"unknown"`; `items` is empty rather than null so callers can iterate without
 * a guard. Items with no title are dropped, because a title is the only field
 * every downstream section relies on.
 */
export function parseFeed(xml) {
  if (typeof xml !== "string" || xml.trim() === "") {
    return { format: "unknown", title: "", items: [] }
  }

  const isAtom = /<feed\b/i.test(xml) && /<entry\b/i.test(xml)
  const isRss = /<rss\b/i.test(xml) || /<channel\b/i.test(xml)

  const format = isAtom ? "atom" : isRss ? "rss" : "unknown"
  if (format === "unknown") return { format, title: "", items: [] }

  const channelMatch = xml.match(/<channel(?:\s[^>]*)?>([\s\S]*?)<\/channel>/i)
  const scope = format === "rss" && channelMatch ? channelMatch[1] : xml

  const itemBlocks = format === "atom" ? extractBlocks(scope, "entry") : extractBlocks(scope, "item")
  const items = itemBlocks
    .map((block) => (format === "atom" ? parseAtomEntry(block) : parseRssItem(block)))
    .filter((item) => item.title && item.title.length > 0)

  return {
    format,
    title: tagText(scope, "title"),
    items,
  }
}

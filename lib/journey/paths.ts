export type JourneyRoute = { module: string; step: string | null; locale: "bg" | "de" | null }

// Letters and hyphens only: a segment with a digit is treated as an id and dropped,
// so a case, contract or document id can never reach the log through a URL.
const NAME = /^[a-z][a-z-]{0,39}$/

function clean(segment: string | undefined): string | null {
  return segment && NAME.test(segment) ? segment : null
}

/** Reduces a pathname to `{module, step}`. Returns null when no module can be named. */
export function normalizeJourneyPath(rawPath: string): JourneyRoute | null {
  const pathname = rawPath.split(/[?#]/, 1)[0] ?? ""
  const segments = pathname.split("/").filter(Boolean)
  let locale: JourneyRoute["locale"] = null
  if (segments[0] === "bg" || segments[0] === "de") locale = segments.shift() as "bg" | "de"
  const moduleName = segments.length === 0 ? "home" : clean(segments[0])
  if (!moduleName) return null
  return { module: moduleName, step: clean(segments[1]), locale }
}

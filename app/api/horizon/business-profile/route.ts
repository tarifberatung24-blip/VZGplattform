import { GET, PUT } from "@/app/api/horizon/business-consultant/profile/route"

export const runtime = "nodejs"

/**
 * Compatibility alias for the Business Profile MVP route.
 *
 * The Business Profile MVP shipped this endpoint at
 * `/api/horizon/business-profile`. The Business Consultant extends the same
 * profile with two additive fields, so rather than run two implementations of one
 * profile write, this path now delegates to the Business Consultant profile
 * route. The URL and its request/response contract are unchanged, so any existing
 * caller keeps working.
 *
 * `runtime` is declared here rather than re-exported: Next.js parses the segment
 * config statically and rejects a re-exported value.
 */
export { GET, PUT }

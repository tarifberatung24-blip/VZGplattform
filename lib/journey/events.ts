import { z } from "zod"

export const JOURNEY_PURPOSE = "product_journey" as const
/** Bump when the wording of the notice about the usage log changes. */
export const JOURNEY_NOTICE_VERSION = "2026-10-11" as const

export const JOURNEY_EVENTS = ["page_view", "client_error"] as const

/**
 * What the browser may send. There is deliberately no free-text field: the route
 * is derived from the pathname on the server and an error is reported by name only.
 */
export const journeyEventSchema = z
  .object({
    event: z.enum(JOURNEY_EVENTS),
    path: z.string().max(200),
    code: z.string().regex(/^[A-Za-z0-9_.:-]{1,40}$/).optional(),
    sessionId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional(),
  })
  .strict()

export type JourneyEventInput = z.infer<typeof journeyEventSchema>

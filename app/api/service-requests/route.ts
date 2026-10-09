import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceRequestKinds } from "../../../lib/service-request"
import { checkRateLimit, getRequestKey } from "../../../lib/rate-limit"
import { markServiceRequestForward, persistServiceRequest } from "../../../lib/affiliate/analytics"
import { createAffiliateAnalyticsClient } from "../../../lib/affiliate/analytics-client"

const requestSchema = z.object({
  kind: z.enum(serviceRequestKinds),
  locale: z.enum(["bg", "de"]).default("bg"),
  landingUrl: z.string().trim().url().max(500).optional(),
  source: z.string().trim().max(80).default("service_request_wizard"),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(180),
    phone: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  answers: z.record(z.string().trim().min(1).max(80), z.string().trim().max(2000)).refine((value) => Object.keys(value).length >= 3, "ANSWERS_INCOMPLETE"),
  consent: z.literal(true),
  website: z.string().trim().max(200).optional(),
}).strict()

function getWebhookUrl() {
  const raw = process.env.AUTOMATION_WEBHOOK_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1"
    if (url.protocol !== "https:" && !local) return null
    return raw
  } catch {
    return null
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

export async function POST(request: Request) {
  const rate = checkRateLimit(getRequestKey(request, "service-request"), { limit: 5, windowMs: 10 * 60_000 })
  if (!rate.allowed) {
    return NextResponse.json({ code: "RATE_LIMITED", retryAfter: rate.retryAfter }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ code: "SERVICE_REQUEST_VALIDATION_FAILED", issues: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.website) {
    return NextResponse.json({ status: "queued", requestId: "accepted" }, { status: 202 })
  }

  const receivedAt = new Date()
  const requestId = `hz_${crypto.randomUUID()}`
  const promisedResponseBy = addMinutes(receivedAt, 120).toISOString()

  // Persist first: the customer request is the business-critical artefact and
  // must survive an orchestrator outage. The write is best-effort (returns null
  // when analytics is unconfigured) and never blocks the webhook hand-off.
  const analytics = createAffiliateAnalyticsClient()
  await persistServiceRequest(analytics, {
    requestId,
    kind: parsed.data.kind,
    locale: parsed.data.locale,
    source: parsed.data.source,
    landingUrl: parsed.data.landingUrl ?? null,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    customer: {
      name: parsed.data.customer.name,
      email: parsed.data.customer.email,
      phone: parsed.data.customer.phone || null,
    },
    answers: parsed.data.answers,
    consent: parsed.data.consent,
    slaMinutes: 120,
    promisedResponseBy,
  })

  const payload = {
    requestId,
    workflow: {
      name: "horizon_offer_request_v1",
      mode: "manual_offer_preparation",
      slaMinutes: 120,
      promisedResponseBy,
    },
    request: {
      kind: parsed.data.kind,
      locale: parsed.data.locale,
      source: parsed.data.source,
      landingUrl: parsed.data.landingUrl ?? null,
      referrer: request.headers.get("referer"),
      userAgent: request.headers.get("user-agent"),
      receivedAt: receivedAt.toISOString(),
    },
    customer: {
      name: parsed.data.customer.name,
      email: parsed.data.customer.email,
      phone: parsed.data.customer.phone || null,
    },
    answers: parsed.data.answers,
    compliance: {
      customerConsent: parsed.data.consent,
      noAutomatedDecision: true,
      noGuaranteedPriceOrApproval: true,
    },
  }

  const webhookUrl = getWebhookUrl()
  const secret = process.env.AUTOMATION_WEBHOOK_SECRET?.trim()
  if (!webhookUrl || !secret) {
    // The request is safely stored; only the hand-off is missing.
    await markServiceRequestForward(analytics, requestId, "not_configured")
    return NextResponse.json({ code: "AUTOMATION_WEBHOOK_NOT_CONFIGURED", requestId }, { status: 503 })
  }

  // Provider-neutral: this route only knows "an automation webhook that accepts
  // a signed JSON payload". The vendor behind AUTOMATION_WEBHOOK_URL (currently
  // Activepieces Cloud) is a deployment choice, not a code dependency, so the
  // orchestrator can be replaced without touching this contract.
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  headers["X-Horizon-Webhook-Secret"] = secret

  try {
    const response = await fetch(webhookUrl, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      await markServiceRequestForward(analytics, requestId, "failed", `HTTP ${response.status}`)
      return NextResponse.json({ code: "AUTOMATION_WEBHOOK_FAILED", requestId }, { status: 502 })
    }
    await markServiceRequestForward(analytics, requestId, "forwarded")
    return NextResponse.json({ status: "queued", requestId }, { status: 202 })
  } catch (error) {
    await markServiceRequestForward(analytics, requestId, "failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ code: "AUTOMATION_WEBHOOK_FAILED", requestId }, { status: 502 })
  }
}

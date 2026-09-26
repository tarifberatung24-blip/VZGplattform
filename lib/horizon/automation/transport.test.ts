import { describe, expect, it } from "vitest"
import {
  AUTOMATION_DELIVERY_FAILED_CODE,
  AUTOMATION_SECRET_HEADER,
  LEGACY_SECRET_HEADER,
  deliverToAutomation,
  newAutomationRequestId,
  resolveAutomationTransport,
  resolveCallbackSecret,
} from "./transport"

/**
 * The transport is the only component that knows an orchestrator exists, so its
 * tests pin exactly that: name resolution, precedence, and a delivery that never
 * varies with the provider on the other end.
 */

const NEUTRAL_URL = "https://automation.example/webhook/negotiation"
const LEGACY_URL = "https://n8n.example/webhook/assisted"

describe("transport — environment resolution", () => {
  it("uses the neutral pair when both neutral names are present", () => {
    const config = resolveAutomationTransport({
      HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL: NEUTRAL_URL,
      HORIZON_AUTOMATION_WEBHOOK_SECRET: "neutral-secret",
      // Legacy values are present too, and must be ignored entirely.
      N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL,
      N8N_WEBHOOK_SECRET: "legacy-secret",
    })
    expect(config).toMatchObject({ url: NEUTRAL_URL, secret: "neutral-secret" })
    expect(config!.source).toEqual({ family: "neutral" })
  })

  it("falls back to the legacy pair only when both neutral names are absent", () => {
    const config = resolveAutomationTransport({
      N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL,
      N8N_WEBHOOK_SECRET: "legacy-secret",
    })
    expect(config).toMatchObject({ url: LEGACY_URL, secret: "legacy-secret" })
    expect(config!.source).toEqual({ family: "legacy" })
  })

  it("refuses a neutral url with a legacy secret rather than blending families", () => {
    // Half-migrated config: borrowing the legacy secret would send one receiver's
    // secret to another. Disabling the handoff surfaces the mistake.
    expect(
      resolveAutomationTransport({
        HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL: NEUTRAL_URL,
        N8N_WEBHOOK_SECRET: "legacy-secret",
      }),
    ).toBeNull()
  })

  it("refuses a legacy url with a neutral secret", () => {
    expect(
      resolveAutomationTransport({
        HORIZON_AUTOMATION_WEBHOOK_SECRET: "neutral-secret",
        N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL,
      }),
    ).toBeNull()
  })

  it("refuses a partial neutral pair even when the legacy pair is complete", () => {
    // The neutral url alone means the operator intended neutral configuration;
    // silently falling back to legacy would send to a receiver they are moving off.
    expect(
      resolveAutomationTransport({
        HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL: NEUTRAL_URL,
        N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL,
        N8N_WEBHOOK_SECRET: "legacy-secret",
      }),
    ).toBeNull()
    expect(
      resolveAutomationTransport({
        HORIZON_AUTOMATION_WEBHOOK_SECRET: "neutral-secret",
        N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL,
        N8N_WEBHOOK_SECRET: "legacy-secret",
      }),
    ).toBeNull()
  })

  it("refuses a partial legacy pair", () => {
    expect(
      resolveAutomationTransport({ N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL: LEGACY_URL }),
    ).toBeNull()
    expect(resolveAutomationTransport({ N8N_WEBHOOK_SECRET: "legacy-secret" })).toBeNull()
  })

  it("returns null when nothing is set", () => {
    expect(resolveAutomationTransport({})).toBeNull()
    expect(resolveAutomationTransport()).toBeNull()
  })

  it("treats a blank value as unset", () => {
    expect(
      resolveAutomationTransport({
        HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL: "   ",
        HORIZON_AUTOMATION_WEBHOOK_SECRET: "s",
      }),
    ).toBeNull()
  })

  it("refuses a non-https url except on localhost", () => {
    const withSecret = (url: string) =>
      resolveAutomationTransport({
        HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL: url,
        HORIZON_AUTOMATION_WEBHOOK_SECRET: "s",
      })
    expect(withSecret("http://automation.example/webhook")).toBeNull()
    expect(withSecret("not a url")).toBeNull()
    expect(withSecret("ftp://automation.example/hook")).toBeNull()
    expect(withSecret("http://localhost:5678/webhook")).not.toBeNull()
    expect(withSecret("http://127.0.0.1:5678/webhook")).not.toBeNull()
  })
})

describe("transport — callback secret resolution", () => {
  it("prefers the neutral name and falls back to the earlier one", () => {
    expect(
      resolveCallbackSecret({
        HORIZON_AUTOMATION_CALLBACK_SECRET: "neutral",
        HORIZON_NEGOTIATION_CALLBACK_SECRET: "earlier",
      }),
    ).toBe("neutral")
    expect(
      resolveCallbackSecret({
        HORIZON_NEGOTIATION_CALLBACK_SECRET: "earlier",
      }),
    ).toBe("earlier")
    expect(resolveCallbackSecret({})).toBeNull()
  })
})

describe("transport — request ids", () => {
  it("marks ids with a stable HORIZON prefix", () => {
    expect(newAutomationRequestId()).toMatch(/^hzn_[0-9a-f-]{36}$/)
  })

  it("does not reuse an id", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newAutomationRequestId()))
    expect(ids.size).toBe(50)
  })
})

describe("transport — delivery", () => {
  const config = { url: NEUTRAL_URL, secret: "s3cret", source: { family: "neutral" } } as const

  it("posts JSON with the neutral secret header and a correlation id", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const result = await deliverToAutomation({
      config,
      payload: { requestId: "hzn_1", negotiation: { category: "internet" } },
      requestId: "hzn_1",
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), init })
        return { ok: true, status: 202 } as Response
      }) as unknown as typeof fetch,
    })

    expect(result).toMatchObject({ ok: true, status: 202, requestId: "hzn_1" })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(NEUTRAL_URL)
    expect(calls[0].init.method).toBe("POST")
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers[AUTOMATION_SECRET_HEADER]).toBe("s3cret")
    expect(headers["X-Horizon-Request-Id"]).toBe("hzn_1")
    expect(headers["Content-Type"]).toBe("application/json")
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      requestId: "hzn_1",
      negotiation: { category: "internet" },
    })
  })

  it("does not send the legacy secret header for a neutral configuration", async () => {
    // A neutral receiver (e.g. Activepieces) is not told the legacy name exists.
    let headers: Record<string, string> = {}
    await deliverToAutomation({
      config,
      payload: { requestId: "hzn_1" },
      requestId: "hzn_1",
      fetchImpl: (async (_url: string, init: RequestInit) => {
        headers = init.headers as Record<string, string>
        return { ok: true, status: 200 } as Response
      }) as unknown as typeof fetch,
    })
    expect(headers[AUTOMATION_SECRET_HEADER]).toBe("s3cret")
    expect(headers[LEGACY_SECRET_HEADER]).toBeUndefined()
    expect(JSON.stringify(headers).toLowerCase()).not.toContain("finanzbg")
  })

  it("still sends the legacy header for a legacy configuration", async () => {
    // An existing n8n receiver keeps working without reconfiguration.
    let headers: Record<string, string> = {}
    await deliverToAutomation({
      config: { url: LEGACY_URL, secret: "legacy-secret", source: { family: "legacy" } },
      payload: { requestId: "hzn_1" },
      requestId: "hzn_1",
      fetchImpl: (async (_url: string, init: RequestInit) => {
        headers = init.headers as Record<string, string>
        return { ok: true, status: 200 } as Response
      }) as unknown as typeof fetch,
    })
    expect(headers[AUTOMATION_SECRET_HEADER]).toBe("legacy-secret")
    expect(headers[LEGACY_SECRET_HEADER]).toBe("legacy-secret")
  })

  it("strips a credential-shaped field from the body even if a caller assembled one", async () => {
    let body = ""
    await deliverToAutomation({
      config,
      payload: { requestId: "hzn_1", providerPassword: "must-not-leave", ok: true },
      requestId: "hzn_1",
      fetchImpl: (async (_url: string, init: RequestInit) => {
        body = String(init.body)
        return { ok: true, status: 200 } as Response
      }) as unknown as typeof fetch,
    })
    expect(body).not.toContain("must-not-leave")
    expect(body.toLowerCase()).not.toContain("password")
    expect(body).toContain('"ok":true')
  })

  it("reports a provider-neutral failure on a non-2xx response", async () => {
    const result = await deliverToAutomation({
      config,
      payload: { requestId: "hzn_1" },
      requestId: "hzn_1",
      fetchImpl: (async () => ({ ok: false, status: 500 }) as Response) as unknown as typeof fetch,
    })
    expect(result).toEqual({ ok: false, code: AUTOMATION_DELIVERY_FAILED_CODE, requestId: "hzn_1" })
  })

  it("reports the same code on a network failure", async () => {
    const result = await deliverToAutomation({
      config,
      payload: { requestId: "hzn_1" },
      requestId: "hzn_1",
      fetchImpl: (async () => {
        throw new Error("ECONNREFUSED")
      }) as unknown as typeof fetch,
    })
    expect(result).toEqual({ ok: false, code: AUTOMATION_DELIVERY_FAILED_CODE, requestId: "hzn_1" })
  })

  it("never echoes the provider's error text", async () => {
    const result = await deliverToAutomation({
      config,
      payload: {},
      requestId: "hzn_1",
      fetchImpl: (async () => {
        throw new Error("Activepieces rejected: bad token")
      }) as unknown as typeof fetch,
    })
    expect(JSON.stringify(result)).not.toContain("Activepieces")
  })
})

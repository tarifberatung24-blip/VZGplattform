import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Webhook } from "npm:standardwebhooks@1.0.0"

const SEVEN_SMS_ENDPOINT = "https://gateway.seven.io/api/sms"
const GERMAN_E164 = /^\+49[1-9]\d{7,13}$/

function jsonResponse(status: number, body: Record<string, unknown> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" })

  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET")
  const sevenApiKey = Deno.env.get("SEVEN_API_KEY")

  if (!hookSecret || !sevenApiKey) {
    console.error("SMS provider configuration is incomplete")
    return jsonResponse(503, { error: "SMS_NOT_CONFIGURED" })
  }

  try {
    const payload = await request.text()
    const secret = hookSecret.replace(/^v1,whsec_/, "")
    const webhook = new Webhook(secret)
    const event = webhook.verify(payload, Object.fromEntries(request.headers)) as {
      user?: { phone?: string }
      sms?: { otp?: string }
    }

    const phone = event.user?.phone
    const otp = event.sms?.otp

    if (!phone || !otp || !GERMAN_E164.test(phone)) {
      return jsonResponse(400, { error: "INVALID_SMS_REQUEST" })
    }

    const body = new URLSearchParams({
      to: phone,
      from: "KintexBG",
      text: `KintexBG: Dein Anmeldecode ist ${otp}.`,
      label: "kintexbg-auth",
    })

    const response = await fetch(SEVEN_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Api-Key": sevenApiKey,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })

    const result = await response.json().catch(() => null) as {
      success?: string | number | boolean
      messages?: Array<{ success?: boolean }>
    } | null
    const accepted = response.ok && (
      String(result?.success) === "100" ||
      result?.messages?.some((message) => message.success === true)
    )

    if (!accepted) {
      console.error("SMS provider rejected the request", { status: response.status })
      return jsonResponse(502, { error: "SMS_DELIVERY_FAILED" })
    }

    return jsonResponse(200)
  } catch (error) {
    console.error("SMS hook failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    })
    return jsonResponse(401, { error: "INVALID_HOOK_REQUEST" })
  }
})

/**
 * Bounded HTTP client for the HORIZON System Steward.
 *
 * The Steward talks to sources it does not control. Every call is therefore
 * treated as hostile-by-default: bounded in time, bounded in bytes, read-only
 * by method, and never allowed to fail the whole run. A source that is down
 * produces a recorded failure, not an exception that aborts the report.
 *
 * Only GET is exposed. The V1 Steward is read-only, and the absence of a
 * write-capable method is the enforcement, not a comment asking callers to
 * behave.
 */

export const DEFAULT_TIMEOUT_MS = 15_000
export const DEFAULT_MAX_BYTES = 3_000_000

export const USER_AGENT =
  "HORIZON-System-Steward/1.0 (+https://vzgplattform.onrender.com; read-only operational monitor)"

/** Thrown when a response is larger than the byte ceiling. */
export class ResponseTooLargeError extends Error {
  constructor(bytes, limit) {
    super(`Response exceeded ${limit} bytes (read ${bytes})`)
    this.name = "ResponseTooLargeError"
  }
}

/**
 * Read a response body with a hard byte ceiling. `response.text()` would buffer
 * an unbounded body into memory first, so the stream is read incrementally and
 * abandoned the moment it crosses the limit.
 */
async function readBoundedText(response, maxBytes) {
  if (!response.body) return await response.text()

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: false })
  let received = 0
  let text = ""

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) throw new ResponseTooLargeError(received, maxBytes)
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.cancel().catch(() => {})
  }

  return text
}

function timeoutSignal(timeoutMs, externalSignal) {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!externalSignal) return timeout
  return AbortSignal.any([timeout, externalSignal])
}

/**
 * GET a URL and return a result object instead of throwing.
 *
 * Returns `{ ok, status, url, contentType, body, bytes, error }`. Callers branch
 * on `ok`; a transport failure and a 5xx are both `ok: false` with a reason, so
 * a dead source degrades the report instead of ending the run.
 */
export async function fetchText(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    headers = {},
    signal,
  } = options

  const started = Date.now()
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: timeoutSignal(timeoutMs, signal),
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/xml, text/xml, application/json, text/html;q=0.8, */*;q=0.5",
        ...headers,
      },
    })

    const contentType = response.headers.get("content-type") ?? ""
    const body = await readBoundedText(response, maxBytes)

    return {
      ok: response.ok,
      status: response.status,
      url,
      finalUrl: response.url || url,
      contentType,
      body,
      bytes: Buffer.byteLength(body, "utf8"),
      elapsedMs: Date.now() - started,
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    const name = error?.name
    const message =
      name === "TimeoutError" || name === "AbortError"
        ? `request timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error)

    return {
      ok: false,
      status: 0,
      url,
      finalUrl: url,
      contentType: "",
      body: "",
      bytes: 0,
      elapsedMs: Date.now() - started,
      error: message,
    }
  }
}

/** GET JSON. A non-JSON or non-2xx response is a recorded failure. */
export async function fetchJson(url, options = {}) {
  const result = await fetchText(url, options)
  if (!result.ok) return { ...result, data: null }
  try {
    return { ...result, data: JSON.parse(result.body) }
  } catch (error) {
    return {
      ...result,
      ok: false,
      data: null,
      error: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/** `fetchJson` with an Authorization header, for the GitHub API. */
export async function fetchJsonWithToken(url, token, options = {}) {
  return fetchJson(url, {
    ...options,
    headers: { authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  })
}

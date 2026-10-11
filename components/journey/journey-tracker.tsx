"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const MAX_ERRORS_PER_LOAD = 5
const NEGATIVE_TTL_MS = 30_000

// Everything here lives in memory only. Nothing is written to cookies, localStorage or sessionStorage.
let status: { enabled: boolean; at: number } | null = null
let pending: Promise<boolean> | null = null
let visitId: string | null = null

/** Forgets the cached answer, so a changed preference applies on the next page view. */
export function resetJourneyStatus() {
  status = null
}

function currentVisitId(): string {
  if (!visitId) {
    visitId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`
  }
  return visitId
}

async function fetchEnabled(): Promise<boolean> {
  try {
    const response = await fetch("/api/journey", { cache: "no-store" })
    if (!response.ok) return false
    const body = (await response.json()) as { enabled?: boolean }
    return body.enabled === true
  } catch {
    return false
  }
}

/**
 * Asks the server whether this visitor is signed in and has recording on. A "yes" is kept for the
 * page load; a "no" is kept for 30 seconds, so signing in without a reload is noticed quickly.
 */
function isEnabled(): Promise<boolean> {
  if (status && (status.enabled || Date.now() - status.at < NEGATIVE_TTL_MS)) return Promise.resolve(status.enabled)
  if (!pending) {
    pending = fetchEnabled().then((enabled) => {
      status = { enabled, at: Date.now() }
      pending = null
      return enabled
    })
  }
  return pending
}

function send(payload: { event: "page_view" | "client_error"; path: string; code?: string }) {
  void fetch("/api/journey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, sessionId: currentVisitId() }),
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * Reports which screen a signed-in user is on and when a script error happens, unless the user has
 * switched recording off. It sends the pathname (the server reduces it to a module and step) and an
 * error name; never page content, form values, or error messages.
 */
export function JourneyTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    let cancelled = false
    void isEnabled().then((enabled) => {
      if (enabled && !cancelled) send({ event: "page_view", path: pathname })
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    let reported = 0
    const report = (name: unknown) => {
      if (reported >= MAX_ERRORS_PER_LOAD) return
      reported += 1
      const code = typeof name === "string" ? name.replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, 40) : ""
      void isEnabled().then((enabled) => {
        if (enabled) send({ event: "client_error", path: window.location.pathname, code: code || "Error" })
      })
    }
    const onError = (event: ErrorEvent) => report((event.error as { name?: unknown } | null)?.name ?? "Error")
    const onRejection = (event: PromiseRejectionEvent) => report((event.reason as { name?: unknown } | null)?.name ?? "UnhandledRejection")
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}

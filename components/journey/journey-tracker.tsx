"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { JOURNEY_STATUS_KEY } from "@/lib/journey/keys"

const SESSION_KEY = "horizon.journey.session"
const STATUS_TTL_MS = 10 * 60_000
const MAX_ERRORS_PER_LOAD = 5

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Storage can be blocked; the tracker then simply asks the server again.
  }
}

function sessionId(): string {
  const existing = readStorage(SESSION_KEY)
  if (existing) return existing
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`
  writeStorage(SESSION_KEY, id)
  return id
}

/** Asks the server once per tab session whether this account opted in. Signed-out visitors cause no request. */
async function isEnabled(): Promise<boolean> {
  const cached = readStorage(JOURNEY_STATUS_KEY)
  if (cached) {
    try {
      const { enabled, at } = JSON.parse(cached) as { enabled?: boolean; at?: number }
      if (typeof at === "number" && Date.now() - at < STATUS_TTL_MS) return enabled === true
    } catch {
      // A malformed cache entry is ignored and replaced below.
    }
  }
  try {
    const { data } = await createClient().auth.getSession()
    if (!data.session) return false
    const response = await fetch("/api/journey", { cache: "no-store" })
    if (!response.ok) return false
    const enabled = ((await response.json()) as { enabled?: boolean }).enabled === true
    writeStorage(JOURNEY_STATUS_KEY, JSON.stringify({ enabled, at: Date.now() }))
    return enabled
  } catch {
    return false
  }
}

function send(payload: { event: "page_view" | "client_error"; path: string; code?: string }) {
  void fetch("/api/journey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, sessionId: sessionId() }),
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * Reports which screen a consenting user is on and when a script error happens. It sends the
 * pathname (the server reduces it to a module and step) and an error name; never page content,
 * form values, or error messages.
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

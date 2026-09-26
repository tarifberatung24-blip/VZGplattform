import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  findDestination,
  isDestinationActive,
  mobilePrimaryIds,
  navDestinations,
  navGroups,
} from "./horizon-nav"
import { isProtectedAppPath } from "../supabase/auth-routing"
import bg from "@/messages/bg.json"
import de from "@/messages/de.json"

describe("HORIZON navigation model", () => {
  it("keeps every destination inside the authentication boundary", () => {
    for (const item of navDestinations) {
      expect(isProtectedAppPath(`/bg${item.href}`)).toBe(true)
      expect(isProtectedAppPath(`/de${item.href}`)).toBe(true)
    }
  })

  it("never points at a public or alias route", () => {
    // `/security` is the public trust page; `/protected` is a redirect alias; the rest are
    // public or legacy. Listing any of them would open the authenticated shell to anon visitors.
    const forbidden = ["/security", "/protected", "/protected/security", "/anspruch", "/email-generator", "/assistant", "/finanzamt", "/office"]
    for (const item of navDestinations) {
      expect(forbidden).not.toContain(item.href)
    }
  })

  it("uses the canonical authenticated security route for the security entry", () => {
    expect(findDestination("security").href).toBe("/konto/sicherheit")
  })

  it("has unique destination ids and unique hrefs", () => {
    const ids = navDestinations.map((item) => item.id)
    const hrefs = navDestinations.map((item) => item.href)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("resolves every label key in both dictionaries", () => {
    for (const locale of [bg, de]) {
      for (const group of navGroups) {
        expect(locale.navGroups[group.labelKey as keyof typeof locale.navGroups]).toBeTruthy()
      }
      for (const item of navDestinations) {
        expect(locale.navItems[item.labelKey as keyof typeof locale.navItems]).toBeTruthy()
      }
      expect(locale.mobileNav.more).toBeTruthy()
    }
  })

  it("keeps the mobile bar at four destinations plus the More trigger", () => {
    expect(mobilePrimaryIds).toHaveLength(4)
    for (const id of mobilePrimaryIds) {
      expect(navDestinations.some((item) => item.id === id)).toBe(true)
    }
    // Owner decisions: slot 4 is contracts; Steuern and Finanzbildung are under More.
    expect(mobilePrimaryIds).toContain("contracts")
    expect(mobilePrimaryIds).not.toContain("taxes")
    expect(mobilePrimaryIds).not.toContain("education")
  })

  it("keeps Finanzbildung out of the three primary desktop groups", () => {
    const primary = navGroups.filter((group) => group.id !== "services").flatMap((group) => group.items)
    expect(primary.some((item) => item.id === "education")).toBe(false)
  })

  it("matches a destination and its nested routes, but not the alias parent", () => {
    expect(isDestinationActive("/dashboard", "/dashboard")).toBe(true)
    expect(isDestinationActive("/steuer/review", "/steuer")).toBe(true)
    expect(isDestinationActive("/guide/case-1", "/guide")).toBe(true)
    expect(isDestinationActive("/protected", "/konto/sicherheit")).toBe(false)
  })

  it("resolves every destination at the localized path the navigation links to", () => {
    // The sidebar and mobile bar link to `/{locale}{href}`. Destinations without a dedicated
    // `app/[locale]/<href>` directory are served by the localized catch-all, so a missing key
    // there silently 404s a primary navigation entry. Guard the whole set, not a sample.
    const catchAll = readFileSync(
      path.join(process.cwd(), "app/[locale]/[[...slug]]/page.tsx"),
      "utf8",
    )
    const keys = new Set(
      [...catchAll.matchAll(/"?([A-Za-z0-9/\-]+)"?\s*:\s*[A-Z][A-Za-z]*Page/g)].map((m) => m[1]),
    )
    for (const item of navDestinations) {
      const slug = item.href.slice(1)
      const dedicated = existsSync(path.join(process.cwd(), "app/[locale]", slug, "page.tsx"))
      if (!dedicated) {
        expect(keys, `/${slug} must be a catch-all key or have a dedicated page`).toContain(slug)
      }
    }
  })
})

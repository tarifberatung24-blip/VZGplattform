import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("auth recovery surface", () => {
  it("uses the same eight-character minimum for registration and recovery", () => {
    expect(read("app/auth/sign-up/page.tsx")).toContain('minLength={8}')
    expect(read("app/auth/update-password/page.tsx")).toContain('minLength={8}')
  })

  it("never uses the development confirmation redirect in production", () => {
    const source = read("app/auth/sign-up/page.tsx")
    expect(source).toContain('process.env.NODE_ENV === "development"')
    expect(source).toContain("emailRedirectTo: developmentRedirect ?? redirectTo")
  })

  it("keeps recovery destinations localized", () => {
    const forgot = read("app/auth/forgot-password/page.tsx")
    const update = read("app/auth/update-password/page.tsx")
    expect(forgot).toContain('`/${locale}/auth/update-password`')
    expect(forgot).toContain('href={`/${locale}/auth/login`}')
    expect(update).toContain('router.replace(`/${locale}/dashboard`)')
    expect(update).toContain('href={`/${locale}/auth/forgot-password`}')
  })

  it("renders recovery copy independently in Bulgarian and German", () => {
    const source = read("app/auth/update-password/page.tsx")
    expect(source).toContain('title: "Нова парола"')
    expect(source).toContain('title: "Neues Passwort"')
    expect(source).not.toContain("BY VZG CONSULT")
  })
})

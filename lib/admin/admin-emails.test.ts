import { describe, expect, it } from "vitest"
import { adminEmailsFromEnv, parseAdminEmails } from "./admin-emails"

describe("admin e-mails", () => {
  it("parses a comma-separated list, case-insensitively", () => {
    expect(parseAdminEmails(" A@x.de, b@Y.com ,,")).toEqual(["a@x.de", "b@y.com"])
    expect(parseAdminEmails(undefined)).toEqual([])
  })

  it("uses ADMIN_EMAILS and falls back to the editor list while it is unset or empty", () => {
    expect(adminEmailsFromEnv({ ADMIN_EMAILS: "a@x.de", EDITOR_ADMIN_EMAILS: "b@x.de" })).toEqual(["a@x.de"])
    expect(adminEmailsFromEnv({ ADMIN_EMAILS: "", EDITOR_ADMIN_EMAILS: "b@x.de" })).toEqual(["b@x.de"])
    expect(adminEmailsFromEnv({})).toEqual([])
  })
})

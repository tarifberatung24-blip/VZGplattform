import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The negotiation migration is the security boundary for the whole feature. These
 * assertions pin the invariants a later edit must not quietly remove: owner-scoped
 * RLS on every table, no anon access, an append-only timeline, and immutable offer
 * content. They read the shipped SQL, because the defect they guard against lives
 * in the migration itself.
 */
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260926090000_horizon_negotiation_engine.sql"),
  "utf8",
).toLowerCase()

const OWNER_SCOPED_TABLES = [
  "negotiation_sessions",
  "negotiation_preferences",
  "negotiation_offers",
  "negotiation_authorizations",
  "negotiation_verifications",
  "negotiation_events",
]

describe("negotiation migration — additive only", () => {
  it("never drops or renames a table", () => {
    expect(migration).not.toMatch(/drop table/)
    expect(migration).not.toMatch(/alter table .* rename/)
  })

  it("extends the contract archive additively", () => {
    expect(migration).toContain("add column if not exists promotion_expiry")
    expect(migration).toContain("add column if not exists services")
    expect(migration).toContain("add column if not exists price_history")
  })
})

describe("negotiation migration — owner isolation", () => {
  it("enables row level security on every negotiation table", () => {
    for (const table of OWNER_SCOPED_TABLES) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it("scopes every policy to the authenticated owner, never to anon or using(true)", () => {
    expect(migration).not.toContain("to anon")
    expect(migration).not.toContain("using (true)")
    for (const table of OWNER_SCOPED_TABLES) {
      expect(migration).toContain(`public.${table}`)
    }
    const ownerChecks = migration.match(/\(select auth\.uid\(\)\) = owner_id/g) ?? []
    expect(ownerChecks.length).toBeGreaterThanOrEqual(OWNER_SCOPED_TABLES.length)
  })

  it("revokes anon access from every negotiation table", () => {
    for (const table of OWNER_SCOPED_TABLES) {
      expect(migration).toContain(`revoke all on public.${table} from anon`)
    }
  })

  it("couples every child foreign key to the owner, not the session id alone", () => {
    // A plain `references negotiation_sessions(id)` would let one customer attach
    // a child row to another customer's session while owning the row themselves,
    // which RLS cannot see. The composite keys close that.
    expect(migration).toContain(
      "foreign key (session_id, owner_id) references public.negotiation_sessions (id, owner_id)",
    )
    expect(migration).toContain(
      "foreign key (household_id, owner_id) references public.households (id, owner_id)",
    )
    expect(migration).toContain(
      "foreign key (contract_id, household_id) references public.contracts (id, household_id)",
    )
    // Every child table carries the composite key.
    for (const table of [
      "negotiation_preferences",
      "negotiation_offers",
      "negotiation_authorizations",
      "negotiation_verifications",
      "negotiation_events",
    ]) {
      expect(migration).toContain(`alter table public.${table}`)
      expect(migration).toContain(`${table}_session_owner_fkey`)
    }
  })
})

describe("negotiation migration — immutable timeline and offers", () => {
  it("grants only select and insert on the event timeline", () => {
    expect(migration).toContain("grant select on public.negotiation_events to authenticated")
    expect(migration).toContain("grant insert (owner_id, session_id, event_type, detail)")
    expect(migration).not.toMatch(/grant update[^;]*on public\.negotiation_events/)
    expect(migration).not.toMatch(/grant delete[^;]*on public\.negotiation_events/)
  })

  it("has no update or delete policy on the event timeline", () => {
    expect(migration).not.toMatch(/on public\.negotiation_events\s+for update/)
    expect(migration).not.toMatch(/on public\.negotiation_events\s+for delete/)
  })

  it("refuses a content edit to an existing offer at the database", () => {
    expect(migration).toContain("reject_negotiation_offer_content_update")
    expect(migration).toContain("negotiation offer content is immutable")
    expect(migration).toContain("before update on public.negotiation_offers")
  })
})

describe("negotiation migration — no credential columns", () => {
  it("has no column for a password, pin, tan, otp or payment secret", () => {
    // Comments explain the rule and legitimately name these words, so the scan
    // runs over the statement text with `--` comments removed.
    const sqlOnly = migration
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n")
    for (const forbidden of ["password", "pin", "tan", "otp", "iban", "cvv", "kartennummer"]) {
      // Column names appear as `<name> <type>`; match the word in that position.
      expect(sqlOnly).not.toMatch(new RegExp(`(^|\\s)${forbidden}\\s+(uuid|text|numeric|integer|boolean|jsonb|timestamptz|date)\\b`))
    }
  })
})

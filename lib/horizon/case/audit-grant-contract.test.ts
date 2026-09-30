import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * Regression guard for a grant that was revoked and silently never restored.
 *
 * 20260919150000_horizon_case_engine.sql granted column-scoped INSERT on
 * audit_events so the case engine could write through the request-scoped
 * session client. 20260920090000_horizon_audit_events_reconcile.sql then ran
 * `revoke all on public.audit_events from anon, authenticated` followed by a
 * SELECT-only grant. Because grants union rather than replace, that revoke
 * cleared the earlier INSERT grant.
 *
 * The consequence was not a failed audit write alone: several engine flows treat
 * a failed audit write as a hard failure and roll the user-visible operation
 * back, so document intake returned UPLOAD_FAILED, deleted the uploaded object
 * again, and the case showed zero documents.
 *
 * These assertions fail if the INSERT grant is dropped again without a later
 * migration restoring it.
 */
const dir = "supabase/migrations"

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()

const auditMigrations = files.filter((f) =>
  readFileSync(`${dir}/${f}`, "utf8").includes("audit_events"),
)

// Comments in these migrations quote the exact grant and revoke statements they
// explain, so matching raw file text would treat prose as executable SQL. Strip
// line and block comments before deciding what a migration actually does.
function executable(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "")
}

function grantsInsertToAuthenticated(sql: string) {
  return /grant\s+insert[\s\S]{0,120}?on\s+public\.audit_events\s+to\s+authenticated/i.test(executable(sql))
}

function revokesFromAuthenticated(sql: string) {
  return /revoke\s+all\s+on\s+public\.audit_events\s+from\s+[^;]*authenticated/i.test(executable(sql))
}

describe("audit_events INSERT grant", () => {
  it("has a migration that grants INSERT to authenticated", () => {
    expect(auditMigrations.filter((f) => grantsInsertToAuthenticated(readFileSync(`${dir}/${f}`, "utf8")))).not.toHaveLength(0)
  })

  it("restores INSERT after the last migration that revokes it", () => {
    const lastRevoke = auditMigrations.filter((f) => revokesFromAuthenticated(readFileSync(`${dir}/${f}`, "utf8"))).at(-1)
    expect(lastRevoke, "no migration revokes the audit_events grant").toBeDefined()

    const restoredAfterRevoke = auditMigrations
      .filter((f) => f > lastRevoke!)
      .filter((f) => grantsInsertToAuthenticated(readFileSync(`${dir}/${f}`, "utf8")))

    expect(
      restoredAfterRevoke,
      `${lastRevoke} revokes the audit_events INSERT grant and no later migration restores it, ` +
        "which makes document intake fail with UPLOAD_FAILED on a fresh environment",
    ).not.toHaveLength(0)
  })
})

/**
 * The other half of the same bug: seven API routes wrote the legacy Kintex
 * column set (household_id, actor_user_id, entity_type, event_type,
 * event_summary) into the reconciled `audit_events` table. Those columns do not
 * exist, so every insert failed with PGRST204 and the returned error was never
 * inspected - the route still answered with success.
 *
 * `platform_audit_events` is a different table that does have those columns, so
 * writes there are legitimate and excluded by matching on the table name.
 */
describe("audit_events writers", () => {
  const routes = readdirSync("app/api", { recursive: true })
    .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))

  it("never insert into audit_events with legacy columns", () => {
    const offenders = routes.filter((f) => {
      const sql = executable(readFileSync(`app/api/${f}`, "utf8"))
      return /\.from\(["']audit_events["']\)/.test(sql) && /actor_user_id|household_id|event_type/.test(sql)
    })

    expect(offenders, `these routes write the legacy audit_events shape: ${offenders.join(", ")}`).toHaveLength(0)
  })

  it("route every audit_events write through the canonical helper", () => {
    const direct = routes.filter((f) => {
      const sql = executable(readFileSync(`app/api/${f}`, "utf8"))
      return /\.from\(["']audit_events["']\)[\s\S]{0,40}?\.insert/.test(sql)
    })

    expect(direct, `these routes bypass recordAuditEvent: ${direct.join(", ")}`).toHaveLength(0)
  })
})

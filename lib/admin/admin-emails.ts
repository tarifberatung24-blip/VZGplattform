/** Parses a comma-separated e-mail allowlist. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)
}

/** `ADMIN_EMAILS`, or the page-editor list until `ADMIN_EMAILS` is set. */
export function adminEmailsFromEnv(env: Record<string, string | undefined> = process.env): string[] {
  return parseAdminEmails(env.ADMIN_EMAILS || env.EDITOR_ADMIN_EMAILS)
}

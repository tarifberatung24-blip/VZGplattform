import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const project = JSON.parse(readFileSync(join(process.cwd(), "supabase", "project.json"), "utf8"))

function parseEnvFile(file) {
  if (!existsSync(file)) return {}
  const values = {}
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || match[1].startsWith("#")) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

const root = process.cwd()
const env = {
  ...parseEnvFile(join(root, ".env")),
  ...parseEnvFile(join(root, ".env.local")),
  ...parseEnvFile(join(root, ".env.development.local")),
  ...process.env,
}

const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const expectedUrl = `https://${project.projectRef}.supabase.co`

function fail(message) {
  console.error(`Supabase check failed: ${message}`)
  process.exit(1)
}

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing.")
if (!key) fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.")
if (url !== expectedUrl) fail(`wrong project URL. Expected ${project.projectName}.`)
if (key.startsWith("sb_secret_")) fail("server-only secret key is configured as a public key.")

if (!key.startsWith("sb_publishable_")) {
  try {
    const [, payloadSegment] = key.split(".")
    const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8"))
    if (payload.role !== "anon" || payload.ref !== project.projectRef) throw new Error("wrong legacy anon key")
  } catch {
    fail("legacy anon key does not belong to the canonical project.")
  }
}

if (process.argv.includes("--config-only")) {
  console.log(`Supabase check OK: ${project.projectName}`)
  process.exit(0)
}

const settingsResponse = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!settingsResponse.ok) fail(`/auth/v1/settings returned HTTP ${settingsResponse.status}.`)
const settings = await settingsResponse.json()
if (settings?.external?.google !== true) fail("Google sign-in is not enabled.")

const checks = [
  "/rest/v1/profiles?select=id,employment_status,household_size,monthly_income,monthly_fixed_costs,completeness&limit=0",
  "/rest/v1/households?select=id,owner_id,name,country&limit=0",
  "/rest/v1/contracts?select=id,household_id,title,category,provider_name,monthly_amount,status&limit=0",
  "/rest/v1/documents?select=id,household_id,original_filename,storage_path,mime_type,size_bytes,processing_status&limit=0",
  "/rest/v1/reminders?select=id,user_id,title,status,due_at&limit=0",
  "/rest/v1/deadlines?select=id,user_id,title,status,due_at&limit=0",
  "/rest/v1/audit_events?select=id,household_id,actor_user_id,entity_type,entity_id,event_type,event_summary,metadata&limit=0",
]

for (const path of checks) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!response.ok) fail(`${path} returned HTTP ${response.status}.`)
}

console.log(`Supabase check OK: ${project.projectName}`)

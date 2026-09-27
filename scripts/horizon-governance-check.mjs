import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const failures = []
const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
const fail = (message) => failures.push(message)

if (fs.existsSync(path.join(root, "SOUL.md"))) {
  fail("SOUL.md is not allowed. Stable agent rules belong in PROJECT_RULES.md / AGENTS.md / AI_WORKFLOW.md.")
}

const layout = read("app/layout.tsx")
if (/maximumScale\s*:\s*1/.test(layout)) fail("Do not cap viewport maximumScale at 1.")
if (/userScalable\s*:\s*false/.test(layout)) fail("Do not disable user zoom.")

const dashboard = read("lib/kintex-smart-dashboard.ts")
for (const stale of [
  'deployment: "Vercel"',
  'automationLayer: "n8n manual offer workflows"',
  'designSystem: "NovaMind institutional finance UI"',
]) {
  if (dashboard.includes(stale)) fail(`Stale runtime metadata: ${stale}`)
}

const legacyTaxRoute = read("app/api/steuer/pdf/route.ts")
if (legacyTaxRoute.includes("PDF_GENERATION_NOT_CONFIGURED") || /status:\s*501/.test(legacyTaxRoute)) {
  fail("Legacy tax readiness route must not be a permanent 501 placeholder.")
}

const serviceRoute = read("app/api/service-requests/route.ts")
if (/process\.env\.N8N_/.test(serviceRoute)) {
  fail("Service-request route must resolve automation through the provider-neutral transport boundary.")
}
const preflight = read("scripts/terra-preflight.mjs")
if (!preflight.includes("HORIZON_AUTOMATION_SERVICE_REQUEST_WEBHOOK_URL")) {
  fail("Terra preflight must report the provider-neutral service-request automation configuration.")
}

const pkg = JSON.parse(read("package.json"))
const master = read("docs/HORIZON_MASTER_MAP.md")
if (pkg.dependencies?.["pdf-lib"] && /no PDF generation library is present|no PDF library/i.test(master)) {
  fail("Master Map claims no PDF library although pdf-lib is installed.")
}

const ledger = read("docs/HORIZON_BUILD_LEDGER.md")
function phaseSection(number) {
  const start = ledger.indexOf(`## PHASE ${number} `)
  if (start < 0) return ""
  const next = ledger.indexOf("\n---\n\n## PHASE ", start + 1)
  return ledger.slice(start, next < 0 ? ledger.length : next)
}
for (const number of [12, 13, 14]) {
  const section = phaseSection(number)
  const status = section.match(/- \*\*CURRENT STATUS:\*\*[\s\S]*?(?=\n- \*\*)/)?.[0] ?? ""
  const missing = section.match(/- \*\*MISSING:\*\*[\s\S]*?(?=\n- \*\*)/)?.[0] ?? ""
  if (/E2E PASS/i.test(status) && /authenticated browser.*(E2E|end-to-end verification)/i.test(missing)) {
    fail(`P${number} says E2E PASS and simultaneously lists browser E2E as missing.`)
  }
}
const p17 = phaseSection(17)
const p17Status = p17.match(/- \*\*CURRENT STATUS:\*\*[\s\S]*?(?=\n- \*\*)/)?.[0] ?? ""
const p17Missing = p17.match(/- \*\*MISSING:\*\*[\s\S]*?(?=\n- \*\*)/)?.[0] ?? ""
if (/contract-to-case linkage/i.test(p17Status) && /contract-to-case linkage/i.test(p17Missing)) {
  fail("P17 cannot mark contract-to-case linkage both shipped and missing.")
}
if (/Adding a PDF dependency requires owner approval/.test(ledger)) {
  fail("Ledger contains the stale pre-pdf-lib dependency blocker.")
}

for (const rulesFile of ["PROJECT_RULES.md", "AGENTS.md", "AI_WORKFLOW.md"]) {
  if (!read(rulesFile).includes("docs/RELIABILITY_GUARDRAILS.md")) {
    fail(`${rulesFile} must reference docs/RELIABILITY_GUARDRAILS.md.`)
  }
}

if (failures.length) {
  console.error("HORIZON governance check FAILED:")
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}
console.log("HORIZON governance check passed.")

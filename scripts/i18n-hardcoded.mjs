import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) files.push(full)
  }
}
walk(path.join(root, "app"))
walk(path.join(root, "components"))
const allowlist = /FinanzberaterBG|ELSTER|ERiC|Supabase|Google|EUR|https?:\/\//
const findings = []
for (const file of files) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (allowlist.test(line) || line.includes("className") || line.includes("import ")) return
    if (/>[^<{]{3,}</.test(line) || /(?:placeholder|aria-label|alt|title)=\"[A-Za-zА-Яа-яÄÖÜäöüß]/.test(line)) findings.push(`${path.relative(root, file)}:${index + 1}`)
  })
}
console.log(`i18n:hardcoded scanned ${files.length} source files`)
if (findings.length) {
  console.log(findings.join("\n"))
  console.log(`Review required: ${findings.length} possible user-facing literals (report-only).`)
}

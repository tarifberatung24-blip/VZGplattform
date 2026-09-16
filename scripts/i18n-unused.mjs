import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const messages = JSON.parse(fs.readFileSync(path.join(root, "messages/bg.json"), "utf8"))
const flatten = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
  const next = prefix ? `${prefix}.${key}` : key
  return child && typeof child === "object" ? flatten(child, next) : [next]
})
const source = fs.readFileSync(path.join(root, "lib/i18n/dictionaries.ts"), "utf8")
const allowlist = new Set(["metadata", "accessibility", "disclosures"])
const unused = flatten(messages).filter((key) => !source.includes(key) && !allowlist.has(key.split(".")[0]))
console.log(`i18n:unused scanned ${flatten(messages).length} keys; dynamic namespaces allowlisted: ${allowlist.size}`)
if (unused.length) console.log(`Dynamic/indirect keys require review: ${unused.slice(0, 20).join(", ")}`)

import fs from "node:fs"

const files = ["bg", "de"].map((locale) => JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8")))
const flatten = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return child && typeof child === "object" ? flatten(child, path) : [path]
})
const [bg, de] = files.map((messages) => new Set(flatten(messages)))
const missing = (from, to) => [...from].filter((key) => !to.has(key))
const empty = files.flatMap((messages, index) => flatten(messages).filter((key) => {
  let value = messages
  for (const part of key.split(".")) value = value[part]
  return typeof value !== "string" || !value.trim() ? `${["bg", "de"][index]}:${key}` : false
}))
const missingBg = missing(de, bg)
const missingDe = missing(bg, de)
if (missingBg.length || missingDe.length || empty.length) {
  console.error(JSON.stringify({ missingBg, missingDe, empty }, null, 2))
  process.exit(1)
}
console.log(`i18n parity OK: ${bg.size} keys; empty values: 0`)

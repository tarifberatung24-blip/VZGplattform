#!/usr/bin/env node
/**
 * Writes a gitignored .env.local from the process environment for local
 * runtime verification. Values are never printed. Run as:
 *   node scripts/local-e2e-setup.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL / ANON key / service token to be present
 * in the process environment (injected by the host secret store).
 */
import { writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const project = JSON.parse(
  (await import("node:fs")).readFileSync(resolve(root, "supabase/project.json"), "utf8"),
)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${project.projectRef}.supabase.co`
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const service = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_ACCESS_TOKEN

if (!anon) throw new Error("anon key missing from environment")
if (!service) throw new Error("service token missing from environment")

const body = [
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
  `SUPABASE_SECRET_KEY=${service}`,
  `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback`,
  "",
].join("\n")

writeFileSync(resolve(root, ".env.local"), body)
console.log("wrote .env.local (values not shown)")

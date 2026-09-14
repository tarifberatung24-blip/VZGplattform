import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'package.json'))
let blocked = false
function report(status, label) { console.log(`${status}: ${label}`) }
for (const executable of ['node', 'pnpm', 'git', 'rg']) {
  const result = spawnSync(executable, ['--version'], { cwd: root, encoding: 'utf8', timeout: 10000 })
  if (result.status !== 0) { blocked = true; report('BLOCKED', `${executable} unavailable`) }
  else report('PASS', `${executable} ${result.stdout.trim().split('\n')[0]}`)
}
for (const name of ['next', 'typescript', 'eslint', 'vitest']) {
  try { require.resolve(`${name}/package.json`); report('PASS', `${name} installed`) }
  catch { blocked = true; report('BLOCKED', `${name} missing; inspect package-manager policy before install`) }
}
for (const path of ['PROJECT_RULES.md', 'AI_WORKFLOW.md', 'pnpm-lock.yaml', 'supabase/project.json']) {
  if (existsSync(resolve(root, path))) report('PASS', path)
  else { blocked = true; report('BLOCKED', `${path} missing`) }
}
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
report(pkg.scripts?.typecheck ? 'PASS' : 'WARN', pkg.scripts?.typecheck ? 'typecheck script present' : 'No typecheck script; run pnpm exec tsc --noEmit explicitly')
const guard = readFileSync(resolve(root, 'lib/documents/validation.ts'), 'utf8')
const project = JSON.parse(readFileSync(resolve(root, 'supabase/project.json'), 'utf8'))
const literal = guard.match(/===\s*["']https:\/\/([a-z0-9]+)\.supabase\.co["']/)
if (literal && literal[1] !== project.projectRef) report('WARN', 'Confirmed static project-ref mismatch in document upload guard; T0 required')
else report('INFO', 'No known literal mismatch detected; regression tests still required')
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'GROQ_API_KEY', 'N8N_OFFER_REQUEST_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET']) {
  report('INFO', `${name}: ${process.env[name] ? 'present in process (validity unchecked)' : 'absent from process (env files not loaded)'}`)
}
const git = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', timeout: 10000 })
if (git.status === 0) report('INFO', `Worktree entries: ${git.stdout.trim() ? git.stdout.trim().split('\n').length : 0}; preserve existing changes`)
else { blocked = true; report('BLOCKED', 'Cannot inspect worktree') }
report('INFO', 'No network calls, secret values, package installs, or production mutations performed')
report(blocked ? 'BLOCKED' : 'READY', blocked ? 'Local toolchain requires attention' : 'Local task preparation only; cloud flows are not certified')
process.exitCode = blocked ? 1 : 0

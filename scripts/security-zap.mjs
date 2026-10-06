import process from "node:process"
import { spawnSync } from "node:child_process"

const args = process.argv.slice(2)
const targetIndex = args.indexOf("--target")
const target = targetIndex >= 0 ? args[targetIndex + 1] : ""
const minutesIndex = args.indexOf("--minutes")
const minutes = minutesIndex >= 0 ? args[minutesIndex + 1] : "5"

if (!target || !/^https:\/\//i.test(target)) {
  console.error("Usage: pnpm security:zap -- --target https://authorized-host.example [--minutes 5]")
  process.exit(2)
}

if (!/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 30) {
  console.error("--minutes must be an integer between 1 and 30")
  process.exit(2)
}

console.log(`OWASP ZAP passive baseline scan: ${target}`)
console.log("Read-only mode: no exploit, fix, commit, or deploy actions.")

const result = spawnSync("docker", [
  "run", "--rm", "-t", "ghcr.io/zaproxy/zaproxy:stable",
  "zap-baseline.py", "-t", target, "-m", minutes, "-I",
  "-z", "-config connection.timeoutInSecs=60",
], { stdio: "inherit", windowsHide: true })

if (result.error) {
  console.error(`Could not start Docker/ZAP: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

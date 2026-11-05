/**
 * Platform health monitor for the HORIZON System Steward.
 *
 * Answers one question: is the deployed product serving the commit we think it
 * is? Three independent signals are compared, because any one of them alone can
 * look healthy while the product is not:
 *
 *  - the live `/api/health` endpoint, which reports the revision Render built;
 *  - the GitHub Actions runs for the repository, which report whether the code
 *    that revision came from passed its checks;
 *  - the commit on `main`, which is the source of truth the deployment should
 *    match.
 *
 * The comparison is the finding. "Health is 200" and "CI is green" are each
 * reported, but a mismatch between the deployed revision and `main` is what a
 * reader needs to act on, so it is called out explicitly.
 */

import { stewardFetch } from "./guard.mjs"

export const HORIZON_PRODUCTION_URL = "https://vzgplattform.onrender.com"
export const HORIZON_REPOSITORY = "tarifberatung24-blip/VZGplattform"

export const HEALTH_SEVERITY = {
  OK: "ok",
  WARNING: "warning",
  CRITICAL: "critical",
  UNKNOWN: "unknown",
}

/**
 * Read the live health endpoint.
 *
 * Render's free plan sleeps, so a cold first request can take about a minute and
 * may return a gateway error while the instance wakes. The retry budget exists
 * for that, not to paper over a real outage: a persistent failure is reported.
 */
export async function readHealthEndpoint(options = {}) {
  const baseUrl = options.baseUrl ?? HORIZON_PRODUCTION_URL
  const url = `${baseUrl.replace(/\/$/, "")}/api/health`
  const attempts = options.attempts ?? 3

  let last = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await stewardFetch(url, {
      json: true,
      timeoutMs: options.timeoutMs ?? 60_000,
      headers: { accept: "application/json" },
    })
    last = response
    if (response.ok && response.data) {
      const data = response.data
      return {
        reachable: true,
        attempts: attempt,
        status: response.status,
        revision: typeof data.revision === "string" ? data.revision : null,
        serviceStatus: typeof data.status === "string" ? data.status : null,
        integrations: data.integrations ?? null,
        capabilities: data.capabilities ?? null,
        error: null,
      }
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 5_000))
  }

  return {
    reachable: false,
    attempts,
    status: last?.status ?? 0,
    revision: null,
    serviceStatus: null,
    integrations: null,
    capabilities: null,
    error: last?.error ?? "health endpoint unreachable",
  }
}

/** Read recent GitHub Actions runs and summarize failures. */
export async function readWorkflowRuns(options = {}) {
  const token = options.token
  if (!token) {
    return {
      available: false,
      reason: "GITHUB_TOKEN is not available; workflow run history was not read",
      runs: [],
      failedRuns: [],
      latestByWorkflow: [],
    }
  }

  const repo = options.repository ?? HORIZON_REPOSITORY
  const perPage = options.perPage ?? 30
  const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=${perPage}`

  const response = await stewardFetch(url, {
    json: true,
    timeoutMs: options.timeoutMs ?? 20_000,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  })

  if (!response.ok || !response.data) {
    return {
      available: false,
      reason: response.error ?? "GitHub Actions API unavailable",
      httpStatus: response.status,
      runs: [],
      failedRuns: [],
      latestByWorkflow: [],
    }
  }

  const runs = (response.data.workflow_runs ?? []).map((run) => ({
    id: run.id,
    name: run.name,
    workflowPath: run.path,
    event: run.event,
    branch: run.head_branch,
    sha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    url: run.html_url,
  }))

  // The newest run per workflow is what a reader cares about; an old failure in
  // a workflow that has since passed is history, not a current risk.
  const latestByWorkflow = []
  const seen = new Set()
  for (const run of runs) {
    const key = run.workflowPath ?? run.name
    if (seen.has(key)) continue
    seen.add(key)
    latestByWorkflow.push(run)
  }

  return {
    available: true,
    reason: null,
    totalCount: response.data.total_count ?? runs.length,
    runs,
    failedRuns: latestByWorkflow.filter((run) => run.conclusion === "failure"),
    inProgress: latestByWorkflow.filter((run) => run.status === "in_progress" || run.status === "queued"),
    latestByWorkflow,
  }
}

/** Read the current commit on `main`, the source of truth. */
export async function readMainCommit(options = {}) {
  const token = options.token
  if (!token) {
    return { available: false, reason: "GITHUB_TOKEN is not available", sha: null }
  }

  const repo = options.repository ?? HORIZON_REPOSITORY
  const response = await stewardFetch(`https://api.github.com/repos/${repo}/commits/main`, {
    json: true,
    timeoutMs: options.timeoutMs ?? 20_000,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  })

  if (!response.ok || !response.data) {
    return { available: false, reason: response.error ?? "commits API unavailable", sha: null }
  }

  return {
    available: true,
    reason: null,
    sha: response.data.sha ?? null,
    shortSha: (response.data.sha ?? "").slice(0, 7),
    message: response.data.commit?.message?.split("\n")[0] ?? null,
    committedAt: response.data.commit?.committer?.date ?? null,
  }
}

/** Read open pull requests, so a pending merge is visible as a pending change. */
export async function readOpenPullRequests(options = {}) {
  const token = options.token
  if (!token) return { available: false, reason: "GITHUB_TOKEN is not available", pullRequests: [] }

  const repo = options.repository ?? HORIZON_REPOSITORY
  const response = await stewardFetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=20`, {
    json: true,
    timeoutMs: options.timeoutMs ?? 20_000,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  })

  if (!response.ok || !Array.isArray(response.data)) {
    return { available: false, reason: response.error ?? "pulls API unavailable", pullRequests: [] }
  }

  return {
    available: true,
    reason: null,
    pullRequests: response.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      draft: Boolean(pr.draft),
      head: pr.head?.ref ?? null,
      url: pr.html_url,
      updatedAt: pr.updated_at,
    })),
  }
}

/**
 * Compare the three signals and produce findings.
 *
 * Each finding carries a severity so the report can sort by what matters. A
 * mismatch between the deployed revision and `main` is a warning, not a failure:
 * Render deploys a few minutes after a merge, so a brief gap is expected.
 */
export function assessHealth(input) {
  const { health, workflows, mainCommit, pullRequests } = input
  const findings = []

  if (!health.reachable) {
    findings.push({
      severity: HEALTH_SEVERITY.CRITICAL,
      code: "HEALTH_ENDPOINT_UNREACHABLE",
      detail: `The production health endpoint did not respond after ${health.attempts} attempts: ${health.error}`,
    })
  } else {
    findings.push({
      severity: HEALTH_SEVERITY.OK,
      code: "HEALTH_ENDPOINT_OK",
      detail: `Production responded ${health.status} with service status "${health.serviceStatus}".`,
    })
    if (health.serviceStatus && health.serviceStatus !== "ok") {
      findings.push({
        severity: HEALTH_SEVERITY.WARNING,
        code: "HEALTH_STATUS_NOT_OK",
        detail: `Health endpoint reported service status "${health.serviceStatus}".`,
      })
    }
    if (health.capabilities && health.capabilities.send === false) {
      findings.push({
        severity: HEALTH_SEVERITY.WARNING,
        code: "SEND_CAPABILITY_DISABLED",
        detail: "Outbound sending is not configured in this deployment (capabilities.send = false).",
      })
    }
  }

  if (!workflows.available) {
    findings.push({
      severity: HEALTH_SEVERITY.UNKNOWN,
      code: "WORKFLOW_HISTORY_UNAVAILABLE",
      detail: workflows.reason,
    })
  } else {
    for (const run of workflows.failedRuns) {
      findings.push({
        severity: HEALTH_SEVERITY.CRITICAL,
        code: "WORKFLOW_RUN_FAILED",
        detail: `${run.name} failed on ${run.branch} at ${run.sha?.slice(0, 7)}: ${run.url}`,
      })
    }
    if (workflows.failedRuns.length === 0) {
      findings.push({
        severity: HEALTH_SEVERITY.OK,
        code: "WORKFLOW_RUNS_GREEN",
        detail: `The latest run of each of ${workflows.latestByWorkflow.length} workflows passed.`,
      })
    }
    for (const run of workflows.inProgress) {
      findings.push({
        severity: HEALTH_SEVERITY.WARNING,
        code: "WORKFLOW_RUN_IN_PROGRESS",
        detail: `${run.name} is ${run.status} on ${run.branch}.`,
      })
    }
  }

  if (health.reachable && mainCommit.available && mainCommit.sha && health.revision) {
    const deployed = health.revision
    const isUnknownRevision = deployed === "unknown"
    const matches = deployed.startsWith(mainCommit.sha.slice(0, 7)) || mainCommit.sha.startsWith(deployed.slice(0, 7))

    if (isUnknownRevision) {
      findings.push({
        severity: HEALTH_SEVERITY.WARNING,
        code: "DEPLOYED_REVISION_UNKNOWN",
        detail: "The deployment did not report RENDER_GIT_COMMIT, so the running revision cannot be confirmed.",
      })
    } else if (!matches) {
      findings.push({
        severity: HEALTH_SEVERITY.WARNING,
        code: "DEPLOYED_REVISION_BEHIND_MAIN",
        detail: `Deployment reports ${deployed.slice(0, 7)} but main is at ${mainCommit.shortSha}. A deploy may be pending.`,
      })
    } else {
      findings.push({
        severity: HEALTH_SEVERITY.OK,
        code: "DEPLOYED_REVISION_MATCHES_MAIN",
        detail: `Deployment ${deployed.slice(0, 7)} matches main ${mainCommit.shortSha}.`,
      })
    }
  } else if (mainCommit.available === false) {
    findings.push({
      severity: HEALTH_SEVERITY.UNKNOWN,
      code: "MAIN_COMMIT_UNAVAILABLE",
      detail: mainCommit.reason,
    })
  }

  if (pullRequests.available && pullRequests.pullRequests.length > 0) {
    findings.push({
      severity: HEALTH_SEVERITY.WARNING,
      code: "OPEN_PULL_REQUESTS",
      detail: `${pullRequests.pullRequests.length} open pull request(s) not yet on main.`,
    })
  }

  const rank = { critical: 0, warning: 1, unknown: 2, ok: 3 }
  findings.sort((a, b) => rank[a.severity] - rank[b.severity])

  return {
    findings,
    overall: findings.some((f) => f.severity === HEALTH_SEVERITY.CRITICAL)
      ? HEALTH_SEVERITY.CRITICAL
      : findings.some((f) => f.severity === HEALTH_SEVERITY.WARNING)
        ? HEALTH_SEVERITY.WARNING
        : HEALTH_SEVERITY.OK,
  }
}

/** Collect every health signal and assess it. */
export async function collectPlatformHealth(options = {}) {
  const health = await readHealthEndpoint(options)
  const [workflows, mainCommit, pullRequests] = await Promise.all([
    readWorkflowRuns(options),
    readMainCommit(options),
    readOpenPullRequests(options),
  ])

  return {
    health,
    workflows,
    mainCommit,
    pullRequests,
    ...assessHealth({ health, workflows, mainCommit, pullRequests }),
  }
}

# HORIZON AI / Agent Orchestration Contract

Status: **FOUNDATION / NOT YET A PRODUCTION PROVIDER CUTOVER**

This document is subordinate to `docs/HORIZON_MASTER_MAP.md`, `PROJECT_RULES.md`,
`AGENTS.md`, and `AI_WORKFLOW.md`. It defines how agents, model providers and
automation systems are connected without turning any model vendor into the product
architecture.

## Scope declaration

- **ACTIVE_PHASE:** cross-phase architecture/governance integration explicitly requested by the owner.
- **ALLOWED_FILES:** AI orchestration policy, AI workflow documentation, environment examples and tests.
- **FROZEN_FILES / SYSTEMS:** Supabase schema/RLS, authentication, production credentials, Render deployment,
  payment systems, existing P1–P17 business logic, provider keys.
- **OUT_OF_SCOPE:** production deploy, schema migration, secret creation, live provider cutover, OpenClaw work.

## 1. Separation of planes

HORIZON has three different planes. They must not be mixed.

### Product runtime plane

```text
HORIZON Next.js
  -> HORIZON AI Runtime policy
  -> provider adapter
  -> provider-neutral LiteLLM gateway (target)
  -> approved model provider
```

The application owns authentication, RLS, case context, deterministic rules,
user-approval gates and audit semantics. The model only performs bounded AI
capabilities already allowed by the application.

### Engineering agent plane

```text
Owner / ChatGPT
  -> OpenHands focused implementation worker
  -> GitHub branch / PR / CI
  -> owner review
  -> merge/deploy only when explicitly authorized
```

AionUI is a local control interface. Manus is a research/setup worker. Gordon is
an infrastructure diagnostic worker. v0 is an optional approved UI source.
OpenClaw is intentionally deferred by owner instruction and is not part of this
integration pass.

Engineering agents never become customer-facing HORIZON identities and never
receive production authority merely because they can edit code.

### Automation/action plane

Activepieces is the currently documented bounded automation system. n8n may be
added only through an explicit decision. Automation may prepare work, enqueue
tasks or execute a separately approved action, but it must not silently bypass:

```text
ANALYZE -> EXPLAIN -> REVIEW -> USER APPROVES -> EXECUTE
```

## 2. Provider target

The target provider path is:

```text
HORIZON
  -> LiteLLM-compatible gateway
      -> PRIMARY: approved Bedrock route
      -> SECONDARY: approved OpenAI route for non-PII/repository workloads
      -> SPECIALIST: approved Vertex route for low-cost/multimodal verification
```

Model names should be gateway aliases (for example `horizon-primary`) rather
than hard-coded vendor model names in application routes. This keeps model
replacement outside product logic.

### Existing runtime during migration

The repository currently contains direct Groq and Cerebras integrations. They
remain **legacy runtime adapters** until the new gateway route is configured,
tested and accepted. This foundation does not delete or silently reroute them.

`OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are declared in the current
environment example, but the repository has no OpenRouter runtime client. They
must therefore be treated as **declared-only**, not as an available fallback.

## 3. Personal-data rule: fail closed

Customer/case/document data may contain personal or sensitive personal data.

A provider failure must not cause a silent change of provider for that data.

```text
approved personal-data primary available -> route
approved personal-data primary unavailable -> BLOCK
```

A switch to a different processor/subprocessor, geography or retention contract
requires a separate governance decision. Availability is not authorization.

The pure policy is implemented in:

`lib/horizon/ai/orchestration.ts`

## 4. Agent authority levels

Agent intelligence and mutation authority are separate.

| Level | Authority | Typical use |
| --- | --- | --- |
| L0 | read only | audit / inspect |
| L1 | plan only | architecture / proposal |
| L2 | sandbox write + tests | bounded implementation |
| L3 | branch/commit/PR | repository worker |
| L4 | privileged engineering actions behind approval | exceptional migrations/config |
| L5 | orchestration of workers | coordination only; does not imply production mutation rights |

Default mapping:

| Agent/system | Default role |
| --- | --- |
| ChatGPT | L5 orchestration, L1 direct mutation unless a connected repo action is explicitly requested |
| OpenHands | L3 focused repo worker |
| Manus | L1 research/setup; L2 only for explicitly bounded setup work |
| Gordon | L0/L1 infrastructure diagnostics |
| AionUI | control interface, no independent mutation authority |
| v0 | approved UI/design source only |
| OpenClaw | deferred; no current HORIZON authority |

A higher orchestration level never grants higher database, deployment, secret or
payment authority.

## 5. System ownership boundaries

| System | Canonical responsibility |
| --- | --- |
| GitHub `main` | source of truth |
| Render | production deployment from approved main |
| Supabase | auth, RLS, application data |
| HORIZON Next.js | product policy, deterministic rules, user gates |
| LiteLLM gateway (target) | provider-neutral model routing, bounded retry, model aliases |
| Bedrock/OpenAI/Vertex | inference providers, not orchestration authority |
| Groq/Cerebras | current legacy inference adapters |
| Activepieces | bounded automation only |
| OTel collector (target) | traces/metrics/audit correlation without raw secrets/docs |

## 6. Required audit envelope

Every provider/agent run that becomes operational should be correlatable with:

```text
run_id
trace_id
repository / commit (engineering work only)
task / phase
agent or runtime component
provider alias
model alias
prompt version
data class
tools/actions attempted
approval events
tests / exit codes where applicable
tokens / cost / latency where available
result
```

Do not log raw API keys, cookies, browser storage, production documents or raw
prompts containing customer data by default.

## 7. Migration sequence

### Pass A — foundation (this change)
- canonical provider/agent separation
- machine-readable routing policy
- fail-closed personal-data rule
- target gateway environment contract
- tests for provider routing policy

### Pass B — runtime adapter
- add one `HorizonAiRuntime` interface
- migrate case assistant, household chat, routing, interviewer, extraction and
  drafting behind that interface without changing their business rails
- keep current Groq/Cerebras adapters until parity tests pass

### Pass C — provider gateway
- connect the runtime adapter to the LiteLLM gateway
- configure model aliases outside application code
- verify Bedrock primary with sentinel/read-only canary
- verify approved secondary providers only with non-PII fixtures
- no production customer document in a canary

### Pass D — observability
- correlate AI calls with OTel `trace_id`
- record provider/model alias, latency, token/cost metadata where available
- redact customer data from traces by default

### Pass E — controlled cutover
- A/B/canary on fixed HORIZON evaluation tasks
- compare success, corrections, latency and cost
- owner approval
- only then retire a legacy direct provider

## 8. Acceptance criteria for a provider to become active

A provider is not active because an API key exists. It is active only when:

1. contract/data-processing boundary is approved for the intended data class;
2. credentials are server-side and absent from repo/logs;
3. model access is verified with non-customer sentinel data;
4. the HORIZON adapter passes deterministic unit/contract tests;
5. rate limit, timeout, retry and circuit-breaker behavior is bounded;
6. provider/model/prompt provenance is emitted;
7. personal-data fallback behavior is fail-closed;
8. a reproducible HORIZON canary passes;
9. production activation is explicitly approved.

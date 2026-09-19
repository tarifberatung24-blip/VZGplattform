# HORIZON by VZG — Execution Checklist

Purpose: one operational view of what is finished, what is active, what is blocked, and what can safely run in parallel.

Canonical status authority remains `docs/HORIZON_BUILD_LEDGER.md`.  
Canonical architecture remains `docs/HORIZON_MASTER_MAP.md`.  
This checklist is the execution/control view and must never silently override either document.

## Legend

- ✅ verified complete for the stated scope
- 🟡 active / in progress
- ⏳ ready next / waiting for prerequisite
- ⬜ not started
- ⛔ blocked
- 🔒 FROZEN after explicit owner acceptance
- 👀 read-only audit/research allowed; no implementation write

## Update rule

- Only the explicitly assigned checklist/control-plane writer updates this file.
- Worker agents do **not** edit this file concurrently. They return a short `CHECKLIST_DELTA` in their handoff.
- A checkbox may become ✅ only after the applicable validation and real verification required by `PROJECT_RULES.md`.
- DONE and FROZEN retain their exact governance meanings. ✅ does not automatically mean 🔒.
- A future phase may be audited/researched in read-only mode while another implementation phase is active, but it must not be implemented early.
- Never mark a GitHub push/CI/deployment successful from an agent claim alone; verify the remote state.

## Current control snapshot

Snapshot base: `main @ 4ca69009b9e6a8e54c16cfb58a646b0e40a628ee`.

Important live-state note: Manus is currently finishing uncommitted P1 work. Until that work is pushed and CI is verified, the items below remain active rather than complete.

### Critical path now

- ✅ P0 governance/map foundation created
- ✅ phase-scoped context loader exists
- ✅ context-loader Node tests: 20/20 under `node:test`
- ⛔ GitHub CI for `4ca6900`: Vitest incorrectly collects `scripts/horizon-context.test.mjs`
- 🟡 P1 public Layer 0 completion
- 🟡 make `/bg/security` and `/de/security` public trust pages with HTTP 200
- 🟡 keep `/{locale}/protected/security` protected for account/MFA security
- 🟡 make `pnpm test` exit 0 without disabling the 20 Node context-loader tests
- ⏳ push P1 completion
- ⏳ verify new GitHub Actions CI is green
- ⏳ owner acceptance of P1
- ⏳ mark P1 🔒 FROZEN only after explicit owner acceptance
- ⏳ activate P2 implementation

---

## Phase execution checklist

### P0 — Master Map + Governance

- ✅ canonical identity defined
- ✅ `PROJECT_RULES.md`
- ✅ `AGENTS.md`
- ✅ `AI_WORKFLOW.md`
- ✅ `docs/HORIZON_MASTER_MAP.md`
- ✅ `docs/HORIZON_BUILD_LEDGER.md`
- ✅ phase-scoped context loader
- ✅ context-loader tests
- ⏳ reconcile any stale status wording in canonical ledger when next governance task is explicitly authorized
- 🔒 FROZEN: NO

### P1 — Public Layer 0

Status: 🟡 ACTIVE

- ✅ BG/DE public-layer implementation substantially present
- ✅ typecheck
- ✅ lint
- ✅ i18n verification
- ✅ production build
- ✅ `git diff --check`
- 🟡 `/bg/security` public trust page → must return 200
- 🟡 `/de/security` public trust page → must return 200
- 🟡 `/protected/security` remains protected
- 🟡 fix Vitest / `node:test` runner conflict
- ⏳ `pnpm test` exits 0
- ⏳ real route verification complete
- ⏳ GitHub Actions green on pushed commit
- ⏳ owner/legal review where required
- ⏳ owner acceptance
- 🔒 FROZEN: NO

### P2 — Auth + First Login + Onboarding

Status: 👀 READ-ONLY PREPARATION ALLOWED

- ✅ existing Supabase auth stack identified
- ✅ login/sign-up/password/MFA surfaces exist
- ✅ profile + locale-related fields exist
- ⬜ first-login detection
- ⬜ onboarding language step
- ⬜ onboarding minimal-profile step
- ⬜ onboarding tour
- ⬜ onboarding finish/resume behavior
- ⬜ persisted onboarding completion state
- ⬜ end-to-end signup → onboarding → dashboard verification
- ⛔ schema change, if required, needs explicit owner authorization
- 🔒 FROZEN: NO

### P3 — HORIZON Guide

Status: ⬜ NOT STARTED

- ⬜ persistent guide route
- ⬜ five intention/task entries
- ⬜ permanent access after onboarding
- ⬜ route task into canonical case creation
- ⬜ localization
- ⬜ tests + real verification
- ⛔ implementation depends on P2 and canonical case path in P5
- 🔒 FROZEN: NO

### P4 — HORIZON Home + Five Entry Modules

Status: ⬜ NOT STARTED

- ⬜ HORIZON dashboard shell
- ⬜ Agentur für Arbeit entry
- ⬜ Jobcenter entry
- ⬜ Kündigung entry
- ⬜ Steuererklärung entry
- ⬜ Unterlagen erklären entry
- ⬜ My Cases
- ⬜ Profile
- ⬜ Settings/Security
- ⬜ remove customer-facing legacy navigation drift
- ⬜ tests + real verification
- ⛔ final module routing depends on P5
- 🔒 FROZEN: NO

### P5 — Shared Case Engine

Status: ⬜ IMPLEMENTATION NOT STARTED

- ✅ existing `cases` stack audited
- ✅ existing `platform_cases` stack audited
- ⬜ choose one canonical case model
- ⬜ unify status vocabulary
- ⬜ canonical module-to-case typing
- ⬜ canonical tasks/audit/drafts/approvals relationship
- ⬜ ownership/RLS verification
- ⬜ cross-tenant isolation tests
- ⬜ state-transition audit trail
- ⛔ architecture/schema decision requires explicit owner authorization
- 🔒 FROZEN: NO

### P6 — Document Intake / OCR / Explanation

Status: ⬜ IMPLEMENTATION NOT STARTED

- ✅ PDF/image upload capabilities exist
- ✅ PDF.js/Tesseract capabilities exist
- ✅ document analysis/review components exist
- ⬜ reconcile the two document stacks
- ⬜ pasted-text intake
- ⬜ email-content intake
- ⬜ page-level evidence for extracted facts
- ⬜ unified extraction contract
- ⬜ explicit OCR/extraction failure states
- ⬜ benchmark before any advanced OCR fallback is adopted
- 🔒 FROZEN: NO

### P7 — Context AI Assistant

Status: ⬜ IMPLEMENTATION NOT STARTED

- ✅ Groq integration exists
- ✅ Cerebras integration exists
- ✅ rate limit/quota/circuit-breaker pieces exist
- ✅ intent/missing-information components exist
- ⬜ canonical case-context persistence
- ⬜ orchestrator/tool boundary
- ⬜ model routing/fallback policy
- ⬜ prompt/model version registry
- ⬜ per-module guard rails
- ⬜ provenance on AI outputs
- ⬜ end-to-end case-context verification
- 🔒 FROZEN: NO

### P8 — Draft / Review / User Approval

Status: ⬜ IMPLEMENTATION NOT STARTED

- ✅ deterministic draft/approval primitives exist
- ✅ hash-bound approval primitive exists
- ⬜ canonical draft/approval model
- ⬜ exact German draft + translation review
- ⬜ confirmed-facts gate
- ⬜ explicit acknowledgement/approval step
- ⬜ content change invalidates approval
- ⬜ unapproved export/send blocked
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

### P9 — Official PDF Form Engine

Status: ⬜ NOT STARTED

- ✅ FMS/tax registry groundwork exists
- ⬜ verified official template registry
- ⬜ selected PDF writer reverified at implementation time
- ⬜ field mapping engine
- ⬜ unknown fields remain empty
- ⬜ immutable original template → working copy
- ⬜ preview/review/approval/download
- ⬜ template provenance/version/hash
- ⛔ new dependency requires explicit owner approval
- 🔒 FROZEN: NO

### P10 — Signature Engine

Status: ⬜ NOT STARTED

- ⬜ distinguish visual signature from cryptographic/PAdES/QES
- ⬜ provider/implementation choice
- ⬜ bind signature to approved document
- ⬜ signature audit event
- ⬜ applicable-form verification
- ⬜ tests + real verification
- 🔒 FROZEN: NO

### P11 — Email Connection + Send Engine

Status: ⬜ NOT STARTED

- ✅ draft download exists
- ⬜ composition adapter
- ⬜ send engine
- ⬜ Gmail OAuth adapter
- ⬜ Microsoft OAuth adapter
- ⬜ generic SMTP path if approved
- ⬜ attachment handling
- ⬜ recipient preview
- ⬜ explicit user approval before send
- ⬜ send result + audit
- 🔒 FROZEN: NO

### P12 — Agentur für Arbeit

Status: ⬜ NOT STARTED

- ⬜ verified official current forms/process sources
- ⬜ module case flow
- ⬜ document intake
- ⬜ missing-information questions
- ⬜ draft/form generation
- ⬜ review/approval
- ⬜ download/send path
- ⬜ audit/deadline handling
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

### P13 — Jobcenter

Status: ⬜ NOT STARTED

- ⬜ verified official current forms/process sources
- ⬜ module case flow
- ⬜ main application + relevant appendices mapping
- ⬜ document intake
- ⬜ missing-information questions
- ⬜ review/approval
- ⬜ download/send path
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

### P14 — Kündigung

Status: ⬜ NOT STARTED

- ⬜ upload/select contract
- ⬜ extract evidenced contract facts
- ⬜ termination data only when source-backed
- ⬜ explain result
- ⬜ generate Kündigungsschreiben
- ⬜ preview/review/approval
- ⬜ optional signature
- ⬜ download/send
- ⬜ audit
- 🔒 FROZEN: NO

### P15 — Steuererklärung

Status: ⬜ NOT STARTED

- ✅ tax model/FMS groundwork exists
- ⬜ verified current official tax forms/process
- ⬜ questionnaire → canonical tax facts
- ⬜ official PDF mapping
- ⬜ review/approval
- ⬜ applicable signature path
- ⬜ manual submission path to competent Finanzamt
- ⬜ no ELSTER submission until a real approved integration exists
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

### P16 — Unterlagen erklären

Status: ⬜ NOT STARTED

- ⬜ upload/select document
- ⬜ OCR/extraction
- ⬜ source-backed explanation
- ⬜ translation where requested
- ⬜ risk/urgency indication with evidence/uncertainty
- ⬜ follow-up actions via canonical case
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

### P17 — Contract Management

Status: ⬜ NOT STARTED

- ✅ existing contract surfaces/data identified
- ⬜ canonical contract model/surface
- ⬜ contract import/intake
- ⬜ deadlines/radar
- ⬜ change/cancellation flows
- ⬜ user-approved actions
- ⬜ audit/history
- ⬜ end-to-end verification
- 🔒 FROZEN: NO

---

## Shared engines

- 🟡 E1 Case Engine — audited; canonical model decision pending P5
- 🟡 E2 Document Intake/OCR — substantial pieces exist; reconciliation pending P6
- ⬜ E3 Translation Layer — canonical shared implementation pending
- ⬜ E4 Risk/Urgency Engine — canonical shared implementation pending
- 🟡 E5 Context AI Assistant — components exist; orchestration pending P7
- 🟡 E6 Draft → Review → Approval — primitives exist; canonicalization pending P8
- ⬜ E7 Official PDF Form Engine — P9
- ⬜ E8 Signature Engine — P10
- ⬜ E9 Email Connection & Send — P11
- 🟡 E10 Audit / Tasks / Deadlines — pieces exist; canonical integration pending

## Research / source preparation queue

Research may run in parallel only when it does not modify the active implementation module.

- ⏳ official Agentur für Arbeit forms/source catalog
- ⏳ official Jobcenter forms/source catalog
- ⏳ official Kindergeld/Kurzarbeitergeld forms where relevant
- ⏳ official FMS/BMF/Finanzamt forms/source catalog
- ⏳ PDF library decision record
- ⏳ visual-signature vs cryptographic-signature decision record
- ⏳ OCR fallback benchmark/research
- ⏳ product-tour decision
- ⏳ email/OAuth provider decision
- ⏳ workflow/state-machine decision: reuse Case Engine unless evidence supports change

Research rule:
`Research → Verify → Compare → Provisional decision → Record → WAIT for active phase → Reverify → Implement → Test → DONE → owner acceptance → FROZEN`.

## Agent queue

### Manus

- 🟡 ACTIVE: finish current P1 blockers in the existing dirty workspace
- ⏳ then hand off exact commit/CI/blocker state
- ⛔ do not start P2 implementation before P1 is accepted

### OpenHands

- 👀 SAFE PARALLEL TASK: P2 read-only audit/preparation against current `origin/main`
- ⛔ no writes to P1 files while Manus owns the active P1 workspace
- ⏳ after P1 acceptance, become primary implementation worker for P2

### ChatGPT / orchestration

- 🟡 verify worker claims against GitHub/CI
- 🟡 maintain task decomposition and agent assignment
- 🟡 reconcile worker `CHECKLIST_DELTA` into this file through the assigned writer
- ⏳ authorize the next implementation phase only after previous-phase acceptance

## Worker handoff delta

Every worker handoff should include only the changes needed to reconcile this board:

```text
CHECKLIST_DELTA:
- completed:
- still_active:
- blocked:
- newly_discovered:
- recommended_next_safe_task:
```

The worker must not mark itself DONE/FROZEN. Final status follows canonical governance and owner acceptance.

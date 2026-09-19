# HORIZON by VZG — Execution Checklist

Това е простият работен списък за проекта.

Правило:
- ✅ = готово и проверено
- Всичко без ✅ още трябва да се направи или потвърди.

Canonical architecture: `docs/HORIZON_MASTER_MAP.md`  
Canonical phase status: `docs/HORIZON_BUILD_LEDGER.md`

Този checklist не отменя Master Map, Build Ledger или governance правилата.

## Текуща позиция

- ✅ P0 governance/map foundation
- ✅ Phase-scoped context loader
- ✅ Context-loader Node tests: 20/20
- ✅ Vitest / node:test conflict fixed
- ✅ GitHub Actions CI green on `ff129b3`
- ✅ P1 public/security routing implementation
- P1 owner/legal acceptance
- P1 FROZEN after explicit owner acceptance
- P2 implementation

---

## P0 — Master Map + Governance

- ✅ Canonical identity
- ✅ `PROJECT_RULES.md`
- ✅ `AGENTS.md`
- ✅ `AI_WORKFLOW.md`
- ✅ `docs/HORIZON_MASTER_MAP.md`
- ✅ `docs/HORIZON_BUILD_LEDGER.md`
- ✅ Phase-scoped context loader
- ✅ Context-loader tests
- Final owner acceptance / freeze status if required by governance

## P1 — Public Layer 0

- ✅ BG/DE public routes
- ✅ `/bg/security` public trust page
- ✅ `/de/security` public trust page
- ✅ `/{locale}/protected/security` remains protected
- ✅ HORIZON branding on active public/auth surfaces
- ✅ Typecheck
- ✅ Lint
- ✅ i18n verification
- ✅ Production build
- ✅ Tests
- ✅ GitHub Actions CI green
- Owner/legal review
- Explicit owner acceptance
- FROZEN

## P2 — Auth + First Login + Onboarding

- ✅ Existing Supabase Auth stack identified
- ✅ Login / sign-up / password reset / MFA exist
- ✅ Profile and locale preference fields exist
- First-login detection
- Onboarding language step
- Onboarding minimal-profile step
- Onboarding tour
- Onboarding finish/resume behavior
- Persisted onboarding completion state
- Signup → onboarding → dashboard end-to-end verification
- Owner approval for schema change if one is required
- FROZEN

## P3 — HORIZON Guide

- Persistent `/{locale}/guide`
- Understand a document
- Reply to an authority
- Fill an official form
- Cancel a contract
- “I do not know what to do”
- Permanent access after onboarding
- Route guide choices into the canonical case flow
- Localization
- Tests
- Real verification
- FROZEN

## P4 — HORIZON Home + Five Entry Modules

- HORIZON dashboard shell
- Agentur für Arbeit
- Jobcenter
- Kündigung
- Steuererklärung
- Unterlagen erklären
- My Cases
- Profile
- Settings / Security
- Tests
- Real verification
- FROZEN

## P5 — Shared Case Engine

- ✅ Existing `cases` stack audited
- ✅ Existing `platform_cases` stack audited
- Choose one canonical case model
- Unify case status vocabulary
- Canonical module-to-case typing
- Canonical tasks / audit / drafts / approvals relationship
- Ownership / RLS verification
- Cross-tenant isolation tests
- State-transition audit trail
- Owner authorization for architecture/schema decision
- FROZEN

## P6 — Document Intake / OCR / Explanation

- ✅ PDF/image upload capabilities exist
- ✅ PDF.js/Tesseract capabilities exist
- ✅ Document analysis/review components exist
- Reconcile parallel document stacks
- Pasted-text intake
- Email-content intake
- Page-level evidence for extracted facts
- Unified extraction contract
- Explicit OCR/extraction failure states
- Benchmark before adopting advanced OCR fallback
- FROZEN

## P7 — Context AI Assistant

- ✅ Groq integration exists
- ✅ Cerebras integration exists
- ✅ Rate-limit / quota / circuit-breaker pieces exist
- ✅ Intent / missing-information components exist
- Canonical case-context persistence
- Orchestrator/tool boundary
- Model routing/fallback policy
- Prompt/model version registry
- Per-module guard rails
- Provenance on AI outputs
- End-to-end case-context verification
- FROZEN

## P8 — Draft / Review / User Approval

- ✅ Deterministic draft primitives exist
- ✅ Hash-bound approval primitive exists
- Canonical draft/approval model
- Exact German draft + translation review
- Confirmed-facts gate
- Explicit acknowledgement/approval
- Content change invalidates approval
- Unapproved export/send blocked
- End-to-end verification
- FROZEN

## P9 — Official PDF Form Engine

- ✅ FMS/tax registry groundwork exists
- Verified official template registry
- Reverify selected PDF writer at implementation time
- Field mapping engine
- Unknown fields remain empty
- Immutable original template → working copy
- Preview / review / approval / download
- Template provenance / version / hash
- Owner approval for new dependency if required
- FROZEN

## P10 — Signature Engine

- Visual-signature scope
- Cryptographic / PAdES / QES scope separated
- Implementation/provider choice
- Bind signature to approved document
- Signature audit event
- Applicable-form verification
- Tests
- Real verification
- FROZEN

## P11 — Email Connection + Send Engine

- ✅ Draft download exists
- Composition adapter
- Send engine
- Gmail OAuth adapter
- Microsoft OAuth adapter
- Generic SMTP path if approved
- Attachment handling
- Recipient preview
- Explicit user approval before send
- Send result + audit
- FROZEN

## P12 — Agentur für Arbeit

- Verified official current forms/process sources
- Module case flow
- Document intake
- Missing-information questions
- Draft/form generation
- Review/approval
- Download/send path
- Audit/deadline handling
- End-to-end verification
- FROZEN

## P13 — Jobcenter

- Verified official current forms/process sources
- Module case flow
- Main application + relevant appendices mapping
- Document intake
- Missing-information questions
- Review/approval
- Download/send path
- End-to-end verification
- FROZEN

## P14 — Kündigung

- Upload/select contract
- Extract evidenced contract facts
- Source-backed termination data
- Explanation
- Kündigungsschreiben
- Preview/review/approval
- Optional signature
- Download/send
- Audit
- FROZEN

## P15 — Steuererklärung

- ✅ Tax model/FMS groundwork exists
- Verified current official tax forms/process
- Questionnaire → canonical tax facts
- Official PDF mapping
- Review/approval
- Applicable signature path
- Manual submission path to competent Finanzamt
- No ELSTER submission until real approved integration exists
- End-to-end verification
- FROZEN

## P16 — Unterlagen erklären

- Upload/select document
- OCR/extraction
- Source-backed explanation
- Translation where requested
- Risk/urgency indication with evidence/uncertainty
- Follow-up actions via canonical case
- End-to-end verification
- FROZEN

## P17 — Contract Management

- ✅ Existing contract surfaces/data identified
- Canonical contract model/surface
- Contract import/intake
- Deadlines/radar
- Change/cancellation flows
- User-approved actions
- Audit/history
- End-to-end verification
- FROZEN

---

## Shared Engines

- ✅ E1 Case Engine — existing implementations audited
- ✅ E2 Document Intake/OCR — existing capabilities identified
- E1 canonical case model
- E2 reconciliation/completion
- E3 Translation Layer
- E4 Risk/Urgency Engine
- E5 Context AI Assistant orchestration
- E6 Draft → Review → Approval canonical flow
- E7 Official PDF Form Engine
- E8 Signature Engine
- E9 Email Connection & Send
- E10 Audit / Tasks / Deadlines canonical integration

## Research

- Official Agentur für Arbeit forms/source catalog
- Official Jobcenter forms/source catalog
- Official Kindergeld/Kurzarbeitergeld sources where relevant
- Official FMS/BMF/Finanzamt forms/source catalog
- PDF library decision record
- Signature decision record
- OCR fallback benchmark/research
- Product-tour decision
- Email/OAuth provider decision
- Workflow/state-machine decision

## Agent Queue

### Manus

- ✅ P1 fix pushed to `main`
- ✅ GitHub Actions CI for `ff129b3` is green
- Next: small, bounded research task

### OpenHands

- P2 read-only audit/preparation
- After P1 acceptance: P2 implementation

### ChatGPT

- Verify worker claims against GitHub/CI
- Maintain task decomposition and agent assignment
- Update this checklist from worker results
- Start the next implementation phase only after the previous phase is accepted

## Worker handoff

Workers should return:

```text
CHECKLIST_DELTA:
- completed:
- remaining:
- blockers:
- next:
```

Only verified completed items receive ✅.

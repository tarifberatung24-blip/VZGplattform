# HORIZON by VZG — Execution Checklist

This is the simple work list for the project.

Rule:
- ✅ = Done and verified
- Everything except ✅ ...still needs to be done or confirmed.

Canonical architecture: `docs/HORIZON_MASTER_MAP.md`  
Canonical phase status: `docs/HORIZON_BUILD_LEDGER.md`

This checklist does not supersede the Master Map, the Build Ledger, or the governance rules.

## Current position

- ✅ P0 governance/map foundation
- ✅ Phase-scoped context loader
- ✅ Context-loader Node tests: 20/20
- ✅ Vitest / node:test conflict fixed
- ✅ GitHub Actions CI green on `ff129b3`
- ✅ P1 public/security routing implementation
- ✅ GitHub Actions CI green on the P2 commit
- ✅ P2 implementation (localization, routes, guard, proxy gate, migration file)
- P1 owner/legal acceptance
- P1 FROZEN after explicit owner acceptance
- P2 migration applied to the project (owner-side authorized channel)
- P2 runtime end-to-end verification (blocked locally: no `.env`/anon key)
- P2 explicit owner acceptance
- ✅ P5 canonical model decision (`public.cases`; `platform_*` retained for compatibility)
- ✅ P5 implementation (repository, lifecycle, approval, audit, and ownership guards)
- P5 runtime/RLS verification against a migrated database

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
- ✅ First-login detection
- ✅ Onboarding language step
- ✅ Onboarding minimal-profile step
- ✅ Onboarding tour
- ✅ Onboarding finish/resume behavior
- ✅ Persisted onboarding completion state (migration file in repository)
- ✅ Proxy gate failure logging (no secrets; no lockout)
- ✅ Typecheck / Lint / i18n / Tests / Production build
- ✅ GitHub Actions CI green on the P2 commit
- Owner-side migration applied to the project
- Signup → onboarding → dashboard end-to-end verification
- Owner approval for schema change if one is required
- FROZEN

## P3 — HORIZON Guide

- ✅ Persistent `/{locale}/guide`
- ✅ Understand a document
- ✅ Reply to an authority
- ✅ Fill an official form
- ✅ Cancel a contract
- ✅ “I do not know what to do”
- ✅ Permanent access after onboarding
- ✅ Route guide choices into the canonical case flow
- ✅ Localization
- ✅ Unit tests
- Real verification
- FROZEN

## P4 — HORIZON Home + Five Entry Modules

- ✅ HORIZON dashboard shell
- ✅ Agentur für Arbeit
- ✅ Jobcenter
- ✅ Kündigung
- ✅ Steuererklärung
- ✅ Unterlagen erklären
- ✅ My Cases
- ✅ Profile
- ✅ Settings / Security
- ✅ Unit tests
- Real verification
- FROZEN

## P5 — Shared Case Engine

- ✅ Existing `cases` stack audited
- ✅ Existing `platform_cases` stack audited
- ✅ Choose one canonical case model (`public.cases`, owner-scoped; `platform_*` preserved legacy)
- ✅ Unify case status vocabulary (canonical lifecycle + adapter to the legacy CHECK)
- ✅ Canonical module-to-case typing (seven modules)
- ✅ Canonical tasks / audit / drafts / approvals relationship
- ✅ Ownership enforcement in every repository operation
- ✅ Cross-tenant isolation tests written (static coherence verified here; live DB run pending)
- ✅ State-transition audit trail
- ✅ Owner authorization for architecture/schema decision
- ✅ Typecheck / Lint / i18n / Tests / Production build
- Run `horizon_case_engine_isolation.sql` against a migrated disposable database
- Confirm no cross-user read/write against a live database
- FROZEN

## P6 — Document Intake / OCR / Explanation

Status: PARTIAL. The current HORIZON intake and legacy document flows coexist.

- ✅ PDF/image upload capabilities exist
- ✅ PDF.js/Tesseract capabilities exist
- ✅ Document analysis/review components exist
- Reconcile parallel document stacks
- ✅ Pasted-text intake
- ✅ Email-content intake
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

Status: PARTIAL / IMPLEMENTATION VERIFIED FOR REFERENCE TEMPLATE — NOT DONE.
End-to-end generation works for one verified reference form (Hauptvordruck
ESt 1 A 2025, page 1). Breadth remains; mechanism is proven. 1 of 9 mappings verified.

- ✅ Source-integrity verification: the template SHA-256 is recomputed from the
  file bytes and a mismatch refuses generation
- ✅ Real format detection from the bytes (AcroForm / XFA / static)
- ✅ Two engine paths kept: AcroForm templates fill real field names; static
  templates use hash-bound measured overlays
- ✅ `pdf-lib` 1.17.1 added as the single approved writer; no second writer
- ✅ Overlay mapping schema: fact key, page, x, yBottom, maxWidth, maxHeight,
  font size, field type (text/checkbox/radio/date/numeric), optional format rule
- ✅ **Coordinates bound to template SHA-256 + tax year + mapping version.** A
  mapping measured for another revision or year is refused, never reused
- ✅ Coordinates measured from the real PDF, not guessed — each field records the
  printed label box and input box it was derived from, and a test re-derives the
  stored values from that evidence
- ✅ **Real functional verification:** a filled PDF was generated and read back;
  all 7 values land inside their printed boxes
- ✅ **German characters render correctly:** `Müller-Öztürk` and `Straße 5` (ß)
  round-trip intact through a reader — verified, not assumed
- ✅ Non-CP1252 values (e.g. Polish/Cyrillic names) are refused before measurement,
  because pdf-lib throws on them; nothing is transliterated
- ✅ Unknown/unconfirmed facts remain blank, with distinct reasons
- ✅ Values too wide for their box are refused, never clipped or shrunk
- ✅ Declared formats applied deterministically (`date_de` only on exact ISO input)
- ✅ **Official template bytes never modified** — verified by hash before/after
- ✅ **Output is a separate artifact** with its own SHA-256, recorded in the manifest
- ✅ **Full provenance:** authority, official source, form name, Form-ID, tax year,
  template SHA-256, mapping version, confirmed inputs, output SHA-256, case id,
  timestamp
- ✅ Approval reuses the P8 hash-bound engine; the manifest is the draft body. No
  second approval mechanism
- ✅ **Private owner-scoped storage:** the artifact is written to the
  `source-documents` bucket under `{ownerId}/{caseId}/...`, and is removed again if
  the draft or audit write fails, so storage and records never disagree
- ✅ 70 PDF tests (27 new overlay tests); full suite now 591 pass; TSC, lint, build pass
- ⬜ Verified overlay mappings for the other 8 FMS templates — each needs its own
  measurement against its own hash. Populating them by guessing is prohibited
- ⬜ Agentur fuer Arbeit and Jobcenter official templates
- ⬜ Preview/download surface wiring for the stored artifact (engine writes and
  audits it; the UI currently reports generation status)
- ⬜ Runtime/E2E verification of the preparation surface (needs an authenticated session)
- ⬜ FROZEN

## P10 — Signature Engine

Status: IN_PROGRESS — a VISUAL signature is applied end-to-end for one verified
reference form (Hauptvordruck ESt 1 A 2025, page 2). Mechanism proven; breadth and
the legal-strength/multi-signatory decisions remain. NOT DONE, NOT FROZEN.

- ✅ Visual-signature scope stated plainly in code, record and UI
- ✅ Cryptographic / PAdES / QES scope separated — the type vocabulary holds only
  `VISUAL`, so no caller can label the output as something stronger
- ✅ Approach implemented for the reference template (`lib/horizon/pdf/signature-*`)
- ✅ **Placement bound to template SHA-256 + tax year + placement version.** An
  unverified template is refused, never estimated
- ✅ Placement measured from the real PDF: the printed caption
  "Datum, Unterschrift(en) …" names the area, which is empty on the page (no drawn
  box, no image, no curve). Evidence recorded as `labelBox` + `areaBox`
- ✅ **Bind signature to approved document:** the signed bytes must hash to the
  manifest's recorded `outputSha256`, and the approval must still match the draft's
  current content hash. A changed document cannot be signed under a stale approval
- ✅ **Approved bytes never mutated** — the signature is drawn onto a copy; verified
  by re-hashing the input after the write
- ✅ Signature image validated by magic bytes (PNG/JPEG only); size and emptiness
  refused; the date must be unambiguous ISO and is refused rather than guessed
- ✅ Explicit confirmation required — an "I accept" button is never presented as a
  signature, and the UI says it is not a qualified or advanced electronic signature
- ✅ **Signature audit event** `pdf_signature_applied` with unsigned hash, signed
  hash, approval content hash, placement version and page
- ✅ Signed artifact stored privately and owner-scoped, with rollback of object and
  row if a later write fails; the signed record is its own draft
- ✅ **Real functional verification:** signed PDF produced from the real P9 artifact;
  image and date extract inside the measured area; date clear of the image; the
  pre-existing QR untouched; page count unchanged; all page-1 values preserved
- ✅ 31 dedicated signature tests; full suite 591 pass; TSC, lint, build pass
- ⬜ Measured signature placements for the other 8 FMS templates
- ⬜ Owner decision: whether a legally stronger signature is required and, if so, which
- ⬜ Multi-signatory support ("Unterschrift(en)" covers spouses; one signature drawn)
- ⬜ Runtime/E2E verification of the signing surface (needs an authenticated session)
- ⬜ FROZEN

## P11 — Email Connection + Send Engine

- ✅ Draft download exists
- Composition adapter
- ✅ Send engine (`lib/horizon/send/`: provider abstraction, registry, recipient, policy, record, actions)
- ✅ Generic SMTP transport (`nodemailer@7.0.9`; server-side env only; all-or-nothing config; STARTTLS required; secure certificate verification not configurable)
- ✅ SMTP configuration validation (12 unit tests; partial/malformed config refuses rather than transmits)
- ⬜ A real provider configured in a running environment (none configured; without it every send ends `PROVIDER_UNAVAILABLE` with nothing transmitted)
- ⬜ Committed automated test for the SMTP transport (transmits over the network; covered so far by a local live-server STARTTLS check, not by unit tests)
- Gmail OAuth adapter
- Microsoft OAuth adapter
- ✅ Attachment handling (selected-only; SHA-256 bound to sent bytes; total-size limit refuses rather than truncates)
- ✅ Recipient preview (recorded address only, never derived; explicit per-send confirmation)
- ✅ Explicit user approval before send (current approval required; per-send confirmation separate from content approval)
- ✅ Send result + audit (blocked / unavailable / failed / sent; no success without a provider message id)
- ✅ Duplicate protection (explicit resend required) and send-record guard (`IS_SEND_RECORD`)
- ⬜ End-to-end runtime verification against a configured transport
- ⬜ FROZEN

## P12 — Agentur für Arbeit

Status: IMPLEMENTED — TESTS AND BUILD VERIFIED — NOT DONE (authenticated runtime E2E pending).

- ✅ Verified official current process/form sources — every cited `arbeitsagentur.de` page and
  online service was re-fetched this session and returned HTTP 200
- ✅ Module case flow — the chosen task is recorded as a confirmed, audited, user-sourced fact on
  the shared case spine, and missing-information derivation is module- and task-aware
  (`requiredKeysFor`), unit-tested including task re-selection
- ✅ Official template provenance — the Veränderungsmitteilung (BA030410) SHA-256 matches the live
  BA file byte-for-byte, and every mapped field name was verified to exist in that template's own
  field list
- ✅ Form generation for the one fillable official form — plan → write → read-back test proves the
  confirmed values render in the produced PDF and the source template is unmodified
- ✅ Online-only processes represented as online-only — three of four tasks expose no official
  fillable PDF and are shown as online-only with the authority's own link; no PDF was invented
- ✅ No invented eligibility, deadline, amount, recipient, or form field; checkbox/radio widgets
  with no evidenced case fact are deliberately left blank and the UI states this
- ⬜ Authenticated browser end-to-end verification
- ⬜ FROZEN

## P13 — Jobcenter

Status: IMPLEMENTED — TESTS AND BUILD VERIFIED — NOT DONE (authenticated runtime E2E pending).

Shipped in `0fb190a` (13 files, +1276 −9); CI green and live on Render at that revision.

- ✅ Verified official current process/form sources — the BA's application, continuation, change
  and Anlage pages, plus the `jobcenter.digital` online services, were re-fetched and cited in
  `JOBCENTER_OFFICIAL_SOURCES`
- ✅ Module case flow — the chosen task is recorded as a confirmed, audited, user-sourced fact on
  the shared case spine; missing-information derivation is task-aware
- ✅ Online-first fact recorded, not converted — the BA states the application is not tied to a
  form, so the online service is shown as recommended while the 04/2026 paper form stays valid
- ✅ No form manufactured for the online-only path — the current SGB II Veränderungsmitteilung has
  no public PDF, so that task exposes none rather than reusing a retired form
- ✅ Conditional, not universal, Anlagen — an Anlage is selected only from confirmed case facts;
  absent or unconfirmed facts activate nothing
- ✅ Official form generation for the fillable entry (Hauptantrag) through P9, with
  `lib/horizon/jobcenter/registry.test.ts` (39 tests) covering selection and refusal branches
- ✅ No invented eligibility, deadline, benefit amount, authority, recipient or form field
- ⬜ Authenticated browser end-to-end verification
- ⬜ FROZEN

## P14 — Kündigung

Status: IMPLEMENTED — TESTS AND BUILD VERIFIED — NOT DONE (authenticated runtime E2E pending).

- ✅ Contract facts read from confirmed facts only — an unconfirmed provider address or contact
  never reaches the letter, and a later confirmed answer supersedes an earlier one
- ✅ Deadline discipline — a Kündigungsfrist or Vertragsende is produced only when the document
  states it or the user has verified it themselves; otherwise the result is `unconfirmed` and the
  letter uses open wording
- ✅ One calculation rule, implemented and tested — the § 309 Nr. 9 BGB ceiling is computed and
  labelled as a legal bound requiring the user's own verification, never as a contractual date
- ✅ "Zum nächstmöglichen Zeitpunkt" is never converted into a date, even when a start date exists
- ✅ Deterministic German letter — no model, no clock read inside the generator; the same facts
  and day produce identical text
- ✅ Real letter PDF via the existing approved writer (`pdf-lib`), byte-identical for identical
  input so approval cannot break on a regeneration; non-WinAnsi characters are refused, not
  transliterated
- ✅ Provenance in the approved draft body — output SHA-256, the facts used and the timing decision
  are inside the text P8 hashes, so `Content changed since approval` invalidates a stale approval
- ✅ No claim of completed cancellation — the letter states it is not sent and that only the
  provider's confirmation ends the contract
- ✅ Signature refused for the self-drawn letter — no verified placement exists for a
  non-official artifact, so P10 is not invoked rather than drawing at a guessed position
- ✅ No invented provider address or email — a send is refused without a recorded, confirmed
  recipient; the recipient is never derived
- ✅ Tests — `lib/horizon/kuendigung/kuendigung.test.ts` (44 tests)
- ⬜ Authenticated browser end-to-end verification (letter preparation, approval, download)
- ⬜ FROZEN

## P15 — Steuererklärung

Status: IMPLEMENTED — NOT DONE — NOT FROZEN. Authenticated runtime E2E remains pending
as part of the consolidated verification pass after P17.

- ✅ Tax model/FMS groundwork exists
- ✅ Tax-year-aware form registry: only 2025 is `supported`; 2026 is `not_yet_published`; other years `out_of_scope`; every entry carries an official source and a verification date
- ✅ Official-source verification performed: ELSTER ESt 1 A lists 2025 back to 2019; no 2026 ESt 1 A/Anlage N is publicly confirmed
- ✅ Unsupported/unpublished years are refused with a reason; no 2025 Form-ID, row, threshold or rule is carried into 2026
- ✅ Tax year recorded as a canonical case fact; missing-information keys become year-scoped
- ✅ Official PDF mapping for ESt 1 A (2025) bound to the exact template SHA-256 and year; a mismatched year or hash is refused
- ✅ Review/approval reuses P8; approval invalidates when the generated content changes
- ✅ Applicable signature path: placement offered only where measured and hash/year-bound
- ✅ Manual submission path to the competent Finanzamt (official online route + official forms links); HORIZON transmits nothing
- ✅ No ELSTER submission: no credential, certificate or transmission field exists anywhere in the registry
- 71 unit tests pass (`lib/horizon/steuer/steuer.test.ts`); tsc/lint/i18n/build green
- Authenticated runtime E2E (deferred to the consolidated pass after P17)
- FROZEN

## P16 — Unterlagen erklären

Status: IMPLEMENTED — NOT DONE — NOT FROZEN. Authenticated runtime E2E remains pending
as part of the consolidated verification pass after P17.

- ✅ Upload/select document (existing P6 stack: PDF, photo, screenshot, pasted text, email content)
- ✅ OCR/extraction (existing P6 stack; pages read through the existing `document_pages_read_own` policy)
- ✅ Classification from printed cues, with the matching line quoted, and `unclear` instead of a nearest guess
- ✅ User correction of the classification, recorded as a confirmed fact and audited as a correction
- ✅ Three-way deadline evidence: `printed` (quoted), `calculated` (only from a period the document itself states, always flagged for verification), `unknown`
- ✅ No German statutory period is hardcoded; a period with no reference date yields no date; an impossible printed date is refused
- ✅ Risk indication with three asymmetric states whose caveats state what was checked, not what is true
- ✅ No accusation of fraud or wrongdoing in any state
- ✅ One next action derived from the evidence, with `no_action_evident` rather than invented work
- ✅ Official German documents stay in German; the explanation explains rather than producing an official translation
- ✅ Follow-up via the canonical case (P8 review/approval, P10 signature, P11 send reused)
- 48 unit tests pass (`lib/horizon/unterlagen/unterlagen.test.ts`); tsc/lint/i18n/build green
- Authenticated runtime E2E (deferred to the consolidated pass after P17)
- FROZEN

## P17 — Contract Management

Status: IMPLEMENTED — NOT DONE — NOT FROZEN. Authenticated runtime E2E remains pending
as part of the consolidated verification pass after P17. The separate preview branch
remains reference-only.

- ✅ Existing contract surfaces/data identified
- ✅ Contract archive reused (`/{locale}/vertraege`, `contracts-workspace`; provider, category, evidenced cost, evidenced dates, `review_status`)
- ✅ Contract import/intake reused (upload + extraction + review, existing `/api/contracts` CRUD)
- ✅ Deterministic Radar reused (`lib/kintex-radar.ts`, `contract_radar_history`) — signals state missing cost and unconfirmed review, never an estimate
- ✅ Cancellation deadline shown from the archive and labelled as awaiting confirmation when `review_status` is not `confirmed`
- ✅ Contract-to-case linkage: "Kündigung vorbereiten" opens a real `kuendigung` case through the shared engine (`lib/horizon/contracts/linkage.ts`, `actions.ts`)
- ✅ Only evidenced fields become case facts; absent fields stay absent so the normal missing-information path asks for them
- ✅ A malformed date is dropped rather than interpreted; a non-existent day is refused
- ✅ The archive's cancel-by deadline is not seeded as a termination date
- ✅ A `needs_review` contract's values seed the case **unconfirmed**, so P14 will not compute or write a date from them
- ✅ Session-client read carries `contracts_household_owner_all` + the household check, so another household's contract behaves like a missing one
- ✅ Audit trail: `contract_linked` (and `contract_link_seed_failed` when seeding fails)
- ✅ Neutral analysis kept separate from affiliate offers (stated in both UI languages)
- ✅ Dashboard shortcut `/{locale}/vertraege` added to real HORIZON navigation
- 18 unit tests pass (`lib/horizon/contracts/contracts.test.ts`); tsc/lint/i18n/build green
- Authenticated runtime E2E (deferred to the consolidated pass)
- FROZEN

---

## Shared Engines

- ✅ E1 Case Engine — existing implementations audited
- ✅ E2 Document Intake/OCR — existing capabilities identified
- ✅ E1 canonical case model (`lib/horizon/case`, owner-scoped `public.cases`)
- E1 runtime/RLS verification against a migrated database
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

- ✅ P2 implementation pushed to `main` (`fcc6ce6`); CI green
- ✅ P5 implementation committed
- Next: apply owner-side migrations, then runtime verification of P2 and P5

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

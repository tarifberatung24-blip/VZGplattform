# HORIZON NEGOTIATION ENGINE

Status: **IN_PROGRESS** — implemented and validated on a feature branch, not merged.
Owner: Tarifberater24 (VZG CONSULT)
Product: `HORIZON by VZG`
Base: `main` @ `0798e44`
Branch: `feature/horizon-negotiation-engine`

This document describes the contract negotiation engine that extends the existing
HORIZON CONTROL → OPTIMIZE architecture. It is a contract action inside OPTIMIZE,
not a new top-level product destination. The feature is off unless
`HORIZON_NEGOTIATION_ENABLED` is set.

Nothing in this document is marked FROZEN. Owner acceptance has not been given.

## 1. Architecture and reuse

The engine is additive. It extends the existing contract archive and reuses the
platform's existing security and UI infrastructure rather than building a parallel
contract system.

```text
/vertraege  (existing archive)
  └─ NegotiationCenter (per eligible contract, flag-gated)
        └─ /api/negotiation/*            (new routes)
              └─ lib/horizon/negotiation/* (deterministic domain)
                    └─ negotiation_* tables (new, additive)
```

Reused, not duplicated:

| Concern | Reused asset |
| --- | --- |
| Contracts | `public.contracts` (extended additively with `promotion_expiry`, `services`, `price_history`) |
| Auth / tenancy | `createClient`, `ensureHousehold`, household owner scoping |
| Audit | `public.platform_audit_events` (household-scoped policy already present) |
| Documents / OCR | existing `documents` upload + extract routes |
| Approvals | the same content-hash approval model used by `platform_correspondence_drafts` |
| Affiliate offers | `lib/affiliate-offers` registry, disclosure requirements unchanged |
| UI | existing `components/ui` primitives and the `kintex-panel` layout |
| Copy | BG/DE parity enforced by the repo's `i18n:check` |

The negotiation domain (`lib/horizon/negotiation/`) is pure and deterministic:
`facts`, `categories`, `opportunity`, `dossier`, `savings`, `preferences`,
`offer-parse`, `verification`, `timeline`, `review`, `execution`, `assisted`,
`callback`, `guard`, `copy`.
Persistence and HTTP live in `repository.ts`, `service.ts` and the routes.

The negotiation routes are `start`, `session/[sessionId]`, `preferences`, `offers`,
`offers/[offerId]/decision`, `authorization`, `assisted` (MODE B handoff and customer
cancel), `assisted/callback` (MODE B operator/n8n status callback), and `verification`.

## 2. State machine

The lifecycle is declared once, in `contract.ts`, and every route advances state by
consulting it. A session cannot jump to a later state through an undeclared edge.

```text
CONTRACT
→ ANALYSIS
→ OPPORTUNITY
→ STRATEGY
→ AUTHORIZATION
→ NEGOTIATION
→ PROVIDER_RESPONSE
→ USER_REVIEW
→ USER_APPROVAL
→ CONFIRMED
→ BILL_VERIFICATION
→ VERIFIED_SAVING
→ MONITOR
```

Decision options, produced by the opportunity engine rather than assumed:

```text
NEGOTIATE | SWITCH | CANCEL | WAIT | NO_ACTION
```

A cancellation window being open does not by itself force `CANCEL`, and an approved
alternative being present does not by itself force `SWITCH`. The engine weighs the
evidenced facts and emits reason codes for whichever action it selects.

### Timeline events

Each transition emits immutable events: `started`, `strategy_created`,
`authorization_given`, `message_prepared`, `message_sent_by_user`,
`message_sent_by_operator`, `provider_response_received`, `offer_parsed`,
`counter_offer_created`, `offer_approved`, `offer_rejected`, `provider_confirmed`,
`verification_due`, `saving_verified`, `saving_failed`. The timeline table grants
`select` and `insert` only — no `update`, no `delete`.

## 3. Opportunity engine

Deterministic rules over evidenced facts only. Input: confirmed contract facts,
provider, current price, price history, term, cancellation deadline, promotion
expiry, services, an approved alternative where one exists, and user preferences.

Output: `action`, `reason_codes[]`, `missing_information[]`,
`opportunity_confidence`, `next_review_date`, `current_monthly_cost`,
`target_monthly_cost`, `potential_monthly_saving`, `potential_annual_saving`.

**No fabrication.** Competitor prices, provider offers, discounts, savings and
acceptance probabilities are never invented. When no verified target offer exists:

```text
target_monthly_cost = null
potential_saving    = null
```

and the UI shows "Vergleichsdaten erforderlich" / "Comparison data required".

The affiliate registry supplies a URL, not a price, so it cannot evidence a monthly
cost. `approvedAlternativeFromRegistry` therefore returns `null` until a verified
quote exists; a partner link is never treated as a price.

## 4. Security model

### Credentials — hard rule

HORIZON never asks for a provider password, banking PIN, TAN, authentication secret
or OTP code. `guard.ts` scans every negotiation payload for credential-shaped field
names (recursively) and refuses the request with
`NEGOTIATION_CREDENTIAL_FIELD_REFUSED`. Metadata written to the audit log is redacted
through the same vocabulary. No credential is stored, logged or forwarded.

Inputs used instead: existing contract data, uploaded invoice/contract PDFs,
OCR-extracted facts, customer number, provider name, tariff, monthly cost, contract
end date, cancellation deadline, services, and an optional user-supplied offer.

A delegated-access (OAuth-style) adapter interface is described in `execution.ts` but
no provider adapter is faked or enabled.

### Tenancy

Every negotiation table is owner-scoped with RLS. Policies resolve the owner through
`public.households.owner_id = auth.uid()`; there is no `to anon` policy and no
`using (true)`. `anon` is revoked on every table. Every repository query filters by
`owner_id` (and the contract lookup by `household_id`), so cross-tenant access is
impossible even if an id is guessed. Route tests assert the filters actually applied.

### Provider communication

Nothing is sent to a provider without an explicit user action, or an explicitly
approved assisted-workflow authorization. Automated execution is disabled by default
and gated by `isExecutionModeEnabled`.

## 5. User approval model

There is **no auto-acceptance**, even when the monthly cost falls.

The review screen shows old vs provider offer vs approved alternative, plus the
effect: monthly saving, 12-month saving, additional binding period, activation fee,
hardware fee and one-time credit. The user chooses ACCEPT, COUNTER, REJECT or
COMPARE SWITCH.

Acceptance binds to the exact offer content hash, mirroring the existing approval
primitive for drafts. Enforcement is server-side in the decision route:

- hash mismatch → `NEGOTIATION_APPROVAL_HASH_MISMATCH`
- hard preference violation → `NEGOTIATION_OFFER_VIOLATES_PREFERENCES`
- already-decided offer → `NEGOTIATION_OFFER_NOT_REVIEWABLE`

The comparison is recomputed from stored content, so a client cannot omit a
constraint to bypass it. Any change to the offer content produces a new hash and
invalidates the prior approval without writing to any approvals table.

### Counter-offer loop

```text
PROVIDER_OFFER → REVIEW → COUNTER_OFFER → PROVIDER_RESPONSE → REVIEW
```

Each step appends to the immutable timeline.

## 6. Category eligibility

Enabled for the first MVP:

- Internet / DSL
- Mobilfunk / mobile phone
- recurring telecom-style contracts

Extensible to Strom, Gas, Kfz, other insurance, subscriptions and further recurring
services. Insurance, credit and regulated financial products remain behind
category-level compliance flags (`CATEGORY_REGULATED`) until separately approved, and
are refused by both the API and the UI.

## 7. Execution modes

- **MODE A — SELF.** HORIZON prepares a phone script, email, contact-form text, chat
  message and checklist. The user executes it.
- **MODE B — ASSISTED.** HORIZON prepares the package for a VZG operator. Only
  required information is passed; no provider credentials. A Vollmacht lifecycle is
  supported but a generic Vollmacht is not assumed to be accepted by every provider —
  the stored scope says what the user agreed to, not what any provider will honour.

  The handoff is refused unless an authorization was granted. The operator queue is
  its own state machine (`mode_b_status`), deliberately separate from the negotiation
  lifecycle (`state`), so a queue position is never inferred from — or confused with —
  the negotiation state:

  ```
  QUEUED → IN_PROGRESS → AWAITING_CUSTOMER ┐
                        → AWAITING_PROVIDER ┤→ IN_PROGRESS
                        → COMPLETED          │
                        → CANCELLED          ┘
  ```

  `COMPLETED` and `CANCELLED` are terminal. A customer may only move a request to
  `CANCELLED`; an operator-driven move arrives through the authenticated callback,
  not the session client. The payload handed to the queue is stripped of any
  credential-shaped field before it leaves the process, and it carries the reviewed
  dossier and plan as they were recorded rather than a recomputation. When the
  transport is not configured the handoff reports
  `NEGOTIATION_ASSISTED_QUEUE_NOT_CONFIGURED` and sends nothing.

  **Transport is provider-neutral.** The queue receiver is not part of the business
  logic. `lib/horizon/automation/transport.ts` owns the only two things that differ
  between orchestrators — where the endpoint is and what secret authenticates the
  call — so HORIZON can point at Activepieces Cloud today and another provider later
  without changing the queue machine, the payload builder or the lifecycle rules:

  - `HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL` — outbound endpoint. https only,
    except `localhost`/`127.0.0.1` during local development. A malformed or insecure
    value is treated as *not configured*, so a typo disables the handoff rather than
    sending a payload somewhere unintended.
  - `HORIZON_AUTOMATION_WEBHOOK_SECRET` — shared secret on the outbound POST, sent in
    the provider-neutral `X-Horizon-Automation-Secret` header (with the legacy
    `X-FinanzBG-Webhook-Secret` as an alias) plus an `X-Horizon-Request-Id`
    correlation header.
  - `HORIZON_AUTOMATION_CALLBACK_SECRET` — shared secret the receiver must present on
    the inbound callback. Deliberately a *different* value from the outbound secret,
    so knowing one does not grant the other.

  The legacy `N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` names are
  still read as a fallback when the neutral ones are unset, so an existing n8n
  receiver keeps working through the rename. Delivery failures collapse to one
  provider-neutral `HORIZON_AUTOMATION_DELIVERY_FAILED`: a non-2xx and a network
  error are indistinguishable to the caller, and a provider-specific message would
  leak which orchestrator is configured. An Activepieces wiring example is in
  §15.

  **Retry-safe, single-sender handoffs.** The id is minted once per logical handoff
  and reused for that handoff's whole life, so a double-submit or a retry carries the
  same `requestId` and a receiver that deduplicates on it will not queue the same
  negotiation twice. Only a terminal request (`COMPLETED`/`CANCELLED`) allows a
  genuinely new id.

  The reservation is a single compare-and-set in `reserve_negotiation_handoff`, not a
  read-then-write from the route, so two concurrent submits cannot both decide they
  are the sender. The function also decides who may deliver:

  - `reserved` — a fresh handoff; this caller sends.
  - `retry` — a previous send failed (`mode_b_delivery_status = FAILED`); this caller
    sends again **with the same id**.
  - `in_flight` — another caller is sending right now; this caller sends nothing.
  - `delivered` — the receiver already has it; nothing is re-sent.
  - `active` — a live handoff past `QUEUED`; a callback proved receipt, so it is not
    re-sent.

  `finalize_negotiation_handoff_delivery` records the outcome (`DELIVERED`/`FAILED`).
  A crash between sending and marking `DELIVERED` leaves `IN_FLIGHT`, which errs
  toward not double-sending; `FAILED` is what permits the retry. The id is never
  re-minted after an ambiguous timeout.

  The transport is stateless and safe to retry for the same reason: the body is built
  from the caller's payload and nothing is recorded on the way out. Configuration is
  resolved pairwise (neutral pair *or* legacy pair, never blended), so a half-migrated
  setup disables the handoff rather than mixing secrets across receivers.

  **Inbound callback.** `POST /api/negotiation/assisted/callback` is how the queue
  reports back. It is a separate endpoint from the customer route because the caller
  is a different principal with different powers:

  - **Authenticated by shared secret.** `HORIZON_AUTOMATION_CALLBACK_SECRET` (with
    the earlier `HORIZON_NEGOTIATION_CALLBACK_SECRET` name still read as a fallback),
    taken from `X-Horizon-Automation-Secret`, the earlier callback header name, or a
    bearer token, and compared in constant time. No session cookie is involved, so
    being logged in neither grants nor denies access.
  - **Ownership by queue key.** The body names a `requestId`; the session is resolved
    by that key only (`negotiation_sessions_mode_b_request_id_key` is a partial unique
    index, so the lookup cannot match two sessions). A callback cannot name a session
    it was not queued for.
  - **Bounded.** Only `mode_b_status` changes, and only along the declared edges.
    The negotiation lifecycle (`state`) is never advanced from here — an operator
    finishing queue work is not the same fact as a provider confirming terms.
  - **Atomic.** The status move and its `operator_status_changed` event are written by
    one function (`apply_negotiation_handoff_status`) in one transaction, so the
    timeline cannot omit a move that was stored. Its own compare-and-set on the status
    the caller observed means two racing callbacks resolve to one applied move.
  - **Idempotent.** A repeat of the stored status returns `applied: false` and writes
    nothing, so a retrying queue cannot duplicate a timeline event.
  - **Append-only.** A move appends one `operator_status_changed` negotiation event
    and one `negotiation.assisted_status_changed` audit line, attributed to a system
    actor (`actor_user_id` null) rather than misattributed to the customer. The
    platform audit line lives in another subsystem's table and is written after the
    atomic move; a failure is reported on the response as `auditError: true` rather
    than swallowed, so a gap in the platform audit trail is observable.
  - **Credential-free.** The body shape is closed and has **no free-text field**.
    A note would be the one place a secret could ride in, and prose cannot be reliably
    scanned for one, so the callback simply has nowhere to put one.

  The callable status set is narrower than the queue's: `QUEUED` is not callable
  (it is a start state) and `CANCELLED` is not callable (an operator must not cancel
  a customer's request — that stays with the customer's PATCH). The callback reads
  the row with the service-role client, because an inbound callback has no session
  and RLS would otherwise hide it; the repository is then constructed with the owner
  id read from that row, so every write remains owner-scoped.
- **MODE C — AUTOMATED.** Adapter interface only. Disabled by default. No provider is
  called, no message sent, no offer accepted, and no impersonation occurs.

## 8. Savings engine

Four strict states, never displayed as one another:

| State | Meaning |
| --- | --- |
| POTENTIAL | based on a real comparison offer, not provider-accepted |
| OFFERED | provider proposed terms |
| CONFIRMED | provider confirmed accepted terms |
| VERIFIED | a later billing statement proves the lower recurring cost |

Calculated separately and deterministically: `old_monthly`, `new_monthly`,
`monthly_recurring_saving`, `annualized_recurring_saving`, `one_time_credit`,
`one_time_fees`, `net_first_year_effect`. Activation fees, hardware costs, the new
minimum term, one-time credits and the temporary-discount duration are surfaced as
warnings, never hidden. `normalizeOfferTerms` fills a partial stored terms object so
an absent field stays absent instead of crashing the calculation or defaulting to a
number.

## 9. Bill verification

After a successful negotiation a verification task is created for the next billing
cycle. The user supplies the next invoice (reusing the document/OCR infrastructure)
and HORIZON compares expected negotiated terms against the actual bill:

```text
VERIFIED | MISMATCH | NOT_YET_EFFECTIVE
```

The expected terms come from the accepted offer's stored facts, not from the request,
so a caller cannot move the goalposts. On `MISMATCH` the exact discrepancy is shown
and a follow-up is created; the saving is **not** marked VERIFIED until evidence
exists.

## 10. Promotion watch and switch fallback

A negotiated discount's expiry date is stored and reminder strategy is prepared at 60
and 30 days before expiry. HORIZON does not automatically renegotiate; the user
explicitly starts the next negotiation.

On rejection or explicit comparison, the flow continues into the existing COMPARE /
SWITCH path. A partner is never presented before the user has seen the current
contract, the alternative, the price difference and the important conditions.
Existing affiliate disclosure requirements are unchanged.

## 11. Future HORIZON Capital interface

Capital is **not** activated in this build. The engine exposes one clean internal
output, and only VERIFIED savings may later feed Capital:

```text
verified_monthly_saving
verified_annual_saving
```

Future flow: verified contract saving → disposable monthly surplus → Capital
scenarios. No investment recommendation or execution here.

## 12. Feature flag

`HORIZON_NEGOTIATION_ENABLED`, default `false`. Read at call time. When disabled, API
routes return `NEGOTIATION_DISABLED` (404) and the negotiation surface is not rendered;
all pre-existing platform behaviour is unchanged.

## 13. Data model

`optimize_sessions` was not extended: its shape models an offer-comparison session,
not a negotiation lifecycle with offers, approvals and verification. New additive
tables were created instead, all owner-scoped:

`negotiation_sessions`, `negotiation_preferences`, `negotiation_offers`,
`negotiation_authorizations`, `negotiation_verifications`, `negotiation_events`.

`negotiation_sessions` also carries the MODE B operator-queue columns
(`mode_b_status`, `mode_b_queued_at`, `mode_b_updated_at`, `mode_b_delivery_status`)
alongside the existing `mode_b_request_id`. The queue state is kept in its own column
so it is never inferred from the negotiation lifecycle, and `mode_b_delivery_status`
(`IN_FLIGHT`/`DELIVERED`/`FAILED`) keeps the outbound send decision separate from the
queue state so a double-submit cannot create two jobs.

**Atomicity.** A second additive migration,
`20260927090000_horizon_negotiation_handoff_atomicity.sql`, adds that column and three
`security invoker` functions: `reserve_negotiation_handoff`,
`finalize_negotiation_handoff_delivery`, and `apply_negotiation_handoff_status`. They
close two read-then-write races — the outbound handoff reservation (which must exist
before anything is sent) and the callback status-plus-event write (which must not
diverge). `security invoker` is deliberate: the functions run with the caller's
privileges and stay subject to row level security, so adding them widens no access.
`apply_negotiation_handoff_status` is execute-granted to `service_role` only; the
other two are available to the authenticated owner.

Every child table is coupled to the owner by a composite foreign key
(`(session_id, owner_id) references negotiation_sessions (id, owner_id)` and the
household/contract chain), so a row cannot reference another customer's session even
if RLS were bypassed. This is asserted in
`supabase/tests/rls/horizon_negotiation_isolation.sql`, run by
`scripts/rls-integration.mjs`.

**Concurrency is proven, not just reasoned.** The SQL test drives every branch of
`reserve_negotiation_handoff` sequentially, which shows the logic but not the
compare-and-set. `scripts/rls-integration.mjs` therefore adds a second phase that
runs two *real* PostgreSQL connections against the same row: one holds the
reservation across a sleep while the other calls reserve. In READ COMMITTED the
second `UPDATE` blocks, re-evaluates after the first commits, finds no row, and is
told `in_flight` — exactly one caller wins. The same shape proves the callback
compare-and-set: two concurrent applies of one move resolve to one applied move and
one no-op, and the timeline carries exactly one event. This is what makes
"single-sender" a measured property rather than a claim.

The transport is likewise tested against a **real loopback HTTP server**, not only an
injected `fetch`: the header names, the credential strip and the timeout are checked
over a real socket. The transport is deliberately indifferent to what answers, so no
orchestrator account is needed to prove it — a paid Activepieces plan would not add
evidence here.

Migration: `supabase/migrations/20260926090000_horizon_negotiation_engine.sql`.
It is additive only — no drops, no renames — and **has not been applied to any
production database**.

## 14. Known legal / product blockers

- Provider representation (Vollmacht) is provider-specific and not universally
  accepted; assisted mode must not imply otherwise.
- No automated provider API exists; MODE C remains a defined interface only.
- Regulated categories need separate compliance approval before enabling.
- Bill verification depends on the user supplying a later invoice.
- Automated execution carries legal exposure if enabled without explicit
  authorization; it stays disabled by default.

## 15. Automation transport wiring (Activepieces example)

HORIZON talks to a generic webhook orchestrator. Nothing below is provider-locked;
Activepieces is used here only as the concrete example because it is the current
target. No real secrets appear in this document — replace the placeholders with
long random values supplied out of band.

### Outbound — HORIZON → orchestrator

HORIZON POSTs a JSON body to `HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL` when a
customer hands a prepared negotiation to the assisted queue.

```
POST https://cloud.activepieces.com/api/v1/webhooks/{{flow-id}}
Content-Type: application/json
X-Horizon-Automation-Secret: {{HORIZON_AUTOMATION_WEBHOOK_SECRET}}
X-Horizon-Request-Id: hzn_<uuid>

{
  "requestId": "hzn_<uuid>",
  "locale": "de",
  "receivedAt": "<iso-8601>",
  "handoff": { "...reviewed dossier and plan as recorded..." }
}
```

The orchestrator should:

1. reject the call unless `X-Horizon-Automation-Secret` matches its stored copy of
   the shared secret (compare in constant time);
2. treat `requestId` as the idempotency key — a repeat of the same id is the same
   logical handoff and must not be processed twice;
3. retain `requestId` so the callback below can name it.

The outbound body is built by HORIZON and contains no credential-shaped field;
HORIZON strips any such field again inside the transport as belt-and-braces. The
orchestrator must not expect, request or store a provider password, PIN, TAN or OTP
— HORIZON never sends one, and a payload asking for one is a sign of a
misconfigured or hostile receiver.

### Inbound — orchestrator → HORIZON

The orchestrator reports queue progress back with:

```
POST https://<horizon-host>/api/negotiation/assisted/callback
Content-Type: application/json
X-Horizon-Automation-Secret: {{HORIZON_AUTOMATION_CALLBACK_SECRET}}

{ "requestId": "hzn_<uuid>", "status": "IN_PROGRESS" }
```

`status` is one of `IN_PROGRESS`, `AWAITING_CUSTOMER`, `AWAITING_PROVIDER`,
`COMPLETED`. The body is closed and has no free-text field, so a note cannot be
attached — this is deliberate. Responses:

| Situation | HTTP | Meaning |
| --- | --- | --- |
| Applied | 200 | status moved; `applied: true` |
| Already in that status | 200 | acknowledged, `applied: false` — a safe retry |
| Unknown `requestId`, or not queued | 404 | no such queued handoff |
| Illegal edge | 409 | transition not permitted from the stored status |
| Bad or missing secret | 401 | not authenticated |
| Flag off | 404 | feature disabled; indistinguishable from absent |
| Secret not configured | 503 | server-side misconfiguration |

A `429` or `5xx` from HORIZON should be retried with the **same** `requestId`; a
`4xx` should not, because the request is wrong rather than unlucky.

### Environment

```dotenv
HORIZON_NEGOTIATION_ENABLED=true
HORIZON_AUTOMATION_NEGOTIATION_WEBHOOK_URL=https://cloud.activepieces.com/api/v1/webhooks/your-flow-id
HORIZON_AUTOMATION_WEBHOOK_SECRET=your-long-random-webhook-secret
HORIZON_AUTOMATION_CALLBACK_SECRET=your-long-random-callback-secret
```

The two secrets must differ: the outbound secret authenticates HORIZON to the
orchestrator, the callback secret authenticates the orchestrator to HORIZON.
Neither is exposed to the browser. Legacy `N8N_NEGOTIATION_ASSISTED_WEBHOOK_URL`
and `N8N_WEBHOOK_SECRET` are read as a fallback when the neutral names are unset.

## 16. Validation

`vitest` (full suite), `node --test scripts/horizon-context.test.mjs` (20 tests),
`tsc --noEmit`, `eslint`, `i18n:check` and `next build` all pass on the branch.


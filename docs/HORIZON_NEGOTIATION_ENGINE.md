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
`offer-parse`, `verification`, `timeline`, `review`, `execution`, `guard`, `copy`.
Persistence and HTTP live in `repository.ts`, `service.ts` and the routes.

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

## 15. Validation

`vitest` (1178 tests), `node --test scripts/horizon-context.test.mjs` (20 tests),
`tsc --noEmit`, `eslint`, `i18n:check` and `next build` all pass on the branch.

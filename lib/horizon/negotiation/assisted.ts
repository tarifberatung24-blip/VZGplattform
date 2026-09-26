/**
 * HORIZON NEGOTIATION — MODE B (ASSISTED) handoff.
 *
 * An assisted negotiation hands the prepared package to a VZG operator. The
 * operator receives only what the negotiation needs, never a provider credential,
 * and the handoff is a state machine of its own so a queue position, an operator
 * outcome, or a cancellation is a recorded fact rather than an implicit status.
 *
 * Two rules are enforced here rather than trusted to a caller:
 *
 *   1. An operator is only ever handed a package when the customer has granted an
 *      authorization. The handoff is refused otherwise, so no operator can start
 *      work the customer has not agreed to.
 *
 *   2. The payload is redacted and scanned for forbidden field names before it
 *      leaves the process. A credential-shaped value cannot reach the operator
 *      queue even if one were assembled upstream by mistake.
 *
 * This module is pure: it builds a payload and validates a status change. The
 * route owns the network call, so the queue transport stays swappable and the
 * rules stay testable without a webhook.
 */

import type { NegotiationPackage } from "./execution"
import type { NegotiationDossier } from "./dossier"
import type { AuthorizationStatus, NegotiationState } from "./contract"
import { findForbiddenFields, stripForbiddenFields } from "./guard"

/** The operator queue states. `QUEUED` is the only entry point. */
export const ASSISTED_REQUEST_STATUSES = [
  "QUEUED",
  "IN_PROGRESS",
  "AWAITING_CUSTOMER",
  "AWAITING_PROVIDER",
  "COMPLETED",
  "CANCELLED",
] as const

export type AssistedRequestStatus = (typeof ASSISTED_REQUEST_STATUSES)[number]

export function isAssistedRequestStatus(value: unknown): value is AssistedRequestStatus {
  return typeof value === "string" && (ASSISTED_REQUEST_STATUSES as readonly string[]).includes(value)
}

/**
 * Legal status moves. A completed or cancelled request is terminal: an operator
 * cannot quietly reopen one, and a customer cannot cancel work already finished.
 */
const ASSISTED_TRANSITIONS: Record<AssistedRequestStatus, AssistedRequestStatus[]> = {
  QUEUED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_CUSTOMER", "AWAITING_PROVIDER", "COMPLETED", "CANCELLED"],
  AWAITING_CUSTOMER: ["IN_PROGRESS", "CANCELLED"],
  AWAITING_PROVIDER: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransitionAssistedRequest(
  from: AssistedRequestStatus,
  to: AssistedRequestStatus,
): boolean {
  return ASSISTED_TRANSITIONS[from]?.includes(to) ?? false
}

export function nextAssistedStatuses(from: AssistedRequestStatus): AssistedRequestStatus[] {
  return [...ASSISTED_TRANSITIONS[from]]
}

export const ASSISTED_HANDOFF_REFUSED_CODE = "NEGOTIATION_ASSISTED_AUTHORIZATION_REQUIRED"

/**
 * Whether an operator package may be handed off now. Representation is the whole
 * point of assisted mode, so a granted authorization is mandatory.
 */
export function canHandOffToOperator(input: {
  authorizationStatus: AuthorizationStatus
}): boolean {
  return input.authorizationStatus === "granted"
}

/** The action the operator should take, derived from the engine's own decision. */
export type AssistedHandoff = {
  sessionId: string
  category: string
  state: NegotiationState
  decisionAction: string | null
  reasonCodes: string[]
  missingInformation: string[]
  currentMonthlyCost: number | null
  targetMonthlyCost: number | null
  promotionExpiry: string | null
  authorizationStatus: AuthorizationStatus
  dossier: NegotiationDossier | null
  plan: NegotiationPackage["plan"]
  artefacts: {
    phoneScript: string | null
    email: string | null
    contactFormText: string | null
    chatMessage: string | null
    checklist: string[]
  }
  requiredBeforeSend: string[]
}

/**
 * Builds the operator payload. `dossier` and `plan` are carried through as they
 * were recorded, so the operator negotiates the package the customer reviewed
 * rather than a recomputation that might have drifted.
 *
 * The result is redacted: any field whose name looks like a credential is
 * replaced, and the function throws if a forbidden field survives, because
 * reaching an operator queue with a secret is worse than failing the handoff.
 */
export function buildAssistedHandoff(input: {
  sessionId: string
  category: string
  state: NegotiationState
  decisionAction: string | null
  reasonCodes: string[]
  missingInformation: string[]
  currentMonthlyCost: number | null
  targetMonthlyCost: number | null
  promotionExpiry: string | null
  authorizationStatus: AuthorizationStatus
  dossier: NegotiationDossier | null
  negotiationPackage: NegotiationPackage
}): AssistedHandoff {
  const payload: AssistedHandoff = {
    sessionId: input.sessionId,
    category: input.category,
    state: input.state,
    decisionAction: input.decisionAction,
    reasonCodes: input.reasonCodes,
    missingInformation: input.missingInformation,
    currentMonthlyCost: input.currentMonthlyCost,
    targetMonthlyCost: input.targetMonthlyCost,
    promotionExpiry: input.promotionExpiry,
    authorizationStatus: input.authorizationStatus,
    dossier: input.dossier,
    plan: input.negotiationPackage.plan,
    artefacts: {
      phoneScript: input.negotiationPackage.phoneScript,
      email: input.negotiationPackage.email,
      contactFormText: input.negotiationPackage.contactFormText,
      chatMessage: input.negotiationPackage.chatMessage,
      checklist: input.negotiationPackage.checklist,
    },
    requiredBeforeSend: input.negotiationPackage.requiredBeforeSend,
  }

  const stripped = stripForbiddenFields(payload as unknown as Record<string, unknown>) as unknown as AssistedHandoff
  const survivors = findForbiddenFields(stripped)
  if (survivors.length > 0) {
    throw new Error(`NEGOTIATION_ASSISTED_PAYLOAD_FORBIDDEN_FIELD:${survivors.join(",")}`)
  }
  return stripped
}

/**
 * The queue payload sent to the operator workflow. Deliberately flat and free of
 * customer identity: the operator queue is keyed by the negotiation session, and
 * the operator resolves the customer through the platform, not through this body.
 */
export function buildAssistedQueuePayload(input: {
  requestId: string
  locale: "bg" | "de"
  handoff: AssistedHandoff
  receivedAt: string
}): Record<string, unknown> {
  return {
    requestId: input.requestId,
    workflow: {
      name: "horizon_negotiation_assisted_v1",
      mode: "assisted_negotiation_preparation",
      locale: input.locale,
    },
    negotiation: input.handoff,
    compliance: {
      // The customer granted representation; the platform does not claim any
      // provider will honour a generic Vollmacht.
      authorizationGranted: input.handoff.authorizationStatus === "granted",
      noProviderCredentials: true,
      noAutomatedDecision: true,
      noGuaranteedSaving: true,
    },
    receivedAt: input.receivedAt,
  }
}

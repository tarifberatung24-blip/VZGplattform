import { describe, expect, it } from "vitest"
import {
  ASSISTED_REQUEST_STATUSES,
  buildAssistedHandoff,
  buildAssistedQueuePayload,
  canHandOffToOperator,
  canTransitionAssistedRequest,
  isAssistedRequestStatus,
  nextAssistedStatuses,
} from "./assisted"
import { emptyPackage } from "./execution"
import type { NegotiationDossier } from "./dossier"

const dossier = {
  currentContract: { known: { provider: "Provider A" }, missing: [] },
  target: { known: { desiredMonthlyCost: 29.99 }, missing: [] },
  leverage: { known: {}, missing: [] },
  plan: { primaryAsk: "Ask for 29.99", fallbackAsk: null, walkAwayCondition: null, switchAlternative: null },
  decisionAction: "NEGOTIATE",
  reasonCodes: ["COMPETITOR_OFFER_BELOW_CURRENT"],
} as unknown as NegotiationDossier

const baseInput = {
  sessionId: "session-1",
  category: "internet",
  state: "AUTHORIZATION" as const,
  decisionAction: "NEGOTIATE",
  reasonCodes: ["COMPETITOR_OFFER_BELOW_CURRENT"],
  missingInformation: [],
  currentMonthlyCost: 49.99,
  targetMonthlyCost: 29.99,
  promotionExpiry: null,
  authorizationStatus: "granted" as const,
  dossier,
  negotiationPackage: emptyPackage("ASSISTED"),
}

describe("assisted mode — operator handoff requires a granted authorization", () => {
  it("refuses the handoff without a granted authorization", () => {
    expect(canHandOffToOperator({ authorizationStatus: "not_required" })).toBe(false)
    expect(canHandOffToOperator({ authorizationStatus: "pending" })).toBe(false)
    expect(canHandOffToOperator({ authorizationStatus: "revoked" })).toBe(false)
  })

  it("permits the handoff only when representation was granted", () => {
    expect(canHandOffToOperator({ authorizationStatus: "granted" })).toBe(true)
  })
})

describe("assisted mode — operator queue state machine", () => {
  it("exposes every declared status", () => {
    for (const status of ASSISTED_REQUEST_STATUSES) {
      expect(isAssistedRequestStatus(status)).toBe(true)
    }
    expect(isAssistedRequestStatus("SOMETHING_ELSE")).toBe(false)
  })

  it("starts only at QUEUED", () => {
    expect(nextAssistedStatuses("QUEUED")).toEqual(["IN_PROGRESS", "CANCELLED"])
  })

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(nextAssistedStatuses("COMPLETED")).toEqual([])
    expect(nextAssistedStatuses("CANCELLED")).toEqual([])
    expect(canTransitionAssistedRequest("COMPLETED", "IN_PROGRESS")).toBe(false)
    expect(canTransitionAssistedRequest("CANCELLED", "IN_PROGRESS")).toBe(false)
  })

  it("does not let a queue jump from QUEUED straight to COMPLETED", () => {
    expect(canTransitionAssistedRequest("QUEUED", "COMPLETED")).toBe(false)
  })

  it("allows the documented forward moves", () => {
    expect(canTransitionAssistedRequest("QUEUED", "IN_PROGRESS")).toBe(true)
    expect(canTransitionAssistedRequest("IN_PROGRESS", "AWAITING_PROVIDER")).toBe(true)
    expect(canTransitionAssistedRequest("AWAITING_PROVIDER", "COMPLETED")).toBe(true)
    expect(canTransitionAssistedRequest("IN_PROGRESS", "CANCELLED")).toBe(true)
  })

  it("walks the full operator chain the callback endpoint accepts", () => {
    const chain = [
      ["QUEUED", "IN_PROGRESS"],
      ["IN_PROGRESS", "AWAITING_PROVIDER"],
      ["AWAITING_PROVIDER", "AWAITING_CUSTOMER"],
      ["AWAITING_CUSTOMER", "IN_PROGRESS"],
      ["IN_PROGRESS", "COMPLETED"],
    ] as const
    for (const [from, to] of chain) {
      expect(canTransitionAssistedRequest(from, to)).toBe(true)
    }
  })

  it("refuses to skip from AWAITING_CUSTOMER straight to COMPLETED", () => {
    // Work cannot finish while a customer answer is still outstanding.
    expect(canTransitionAssistedRequest("AWAITING_CUSTOMER", "COMPLETED")).toBe(false)
  })
})

describe("assisted mode — payload carries the reviewed package, never a credential", () => {
  it("carries the dossier and plan through unchanged", () => {
    const handoff = buildAssistedHandoff(baseInput)
    // `stripForbiddenFields` rebuilds the object, so identity is not preserved,
    // but the content must be.
    expect(handoff.dossier).toEqual(dossier)
    expect(handoff.authorizationStatus).toBe("granted")
    expect(handoff.currentMonthlyCost).toBe(49.99)
  })

  it("does not include a customer identity or a provider credential", () => {
    const handoff = buildAssistedHandoff(baseInput)
    const serialized = JSON.stringify(handoff)
    for (const forbidden of ["password", "passwort", "pin", "tan", "otp", "iban", "cvv"]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden)
    }
  })

  it("redacts a credential-shaped field rather than forwarding it", () => {
    const handoff = buildAssistedHandoff({
      ...baseInput,
      negotiationPackage: {
        ...emptyPackage("ASSISTED"),
        checklist: ["have customer number ready"],
      },
    })
    // A forbidden key smuggled into the dossier is replaced, not passed on.
    const tainted = buildAssistedHandoff({
      ...baseInput,
      dossier: { ...dossier, providerPassword: "should-never-leave" } as unknown as NegotiationDossier,
    })
    expect(JSON.stringify(tainted)).not.toContain("should-never-leave")
    expect(JSON.stringify(tainted)).not.toContain("providerPassword")
    expect(handoff.artefacts.checklist).toEqual(["have customer number ready"])
  })

  it("states the compliance position rather than a promise", () => {
    const payload = buildAssistedQueuePayload({
      requestId: "hzn_1",
      locale: "de",
      handoff: buildAssistedHandoff(baseInput),
      receivedAt: "2026-09-26T00:00:00.000Z",
    })
    const compliance = payload.compliance as Record<string, boolean>
    expect(compliance.authorizationGranted).toBe(true)
    expect(compliance.noProviderCredentials).toBe(true)
    expect(compliance.noGuaranteedSaving).toBe(true)
    expect(compliance.noAutomatedDecision).toBe(true)
  })
})

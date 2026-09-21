import { describe, expect, it, vi } from "vitest"

// `server-only` throws outside a React Server Component graph; the send engine is
// server-only by design, so the guard is stubbed for these unit tests.
vi.mock("server-only", () => ({}))

import {
  assessTerminationTiming,
  endOfFollowingMonth,
  readKuendigungFacts,
  timingIsFirm,
  KUENDIGUNG_FACT_KEYS,
  KUENDIGUNG_REQUIRED_KEYS,
  MAX_NOTICE_RULE,
  type KuendigungFact,
} from "./facts"
import { buildKuendigungLetter, formatGermanDate, kuendigungExplanation } from "./letter"
import { renderLetterBody, renderLetterSubject, readLetterOutputSha } from "./manifest"
import { getKuendigungCopy } from "./copy"
import { signaturePlacementForTemplate, verifiedSignatureTemplateIds } from "../pdf/signature-map"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { generateLetterPdf } from "../pdf/letter-writer"
import { computeSha256 } from "../pdf/source"
import { assessDraftRelease, canApproveDraft } from "../case/release"
import { buildApprovalPayload, computeContentHash, isApprovalValid } from "../case/approval"
import { planSend, type SendPlanInput } from "../send/send-plan"
import { deriveMissingInformation, requiredKeysFor } from "../case/missing-info"
import { checkRecipient } from "../send/recipient"
import type { CaseApproval, CaseDraft } from "../case/contract"

const confirmed = (key: string, value: string): KuendigungFact => ({
  key,
  value,
  confirmedAt: "2026-01-01T00:00:00.000Z",
})

const unconfirmed = (key: string, value: string): KuendigungFact => ({
  key,
  value,
  confirmedAt: null,
})

const BASE_FACTS: KuendigungFact[] = [
  confirmed(KUENDIGUNG_FACT_KEYS.provider, "Telekom Deutschland GmbH"),
  confirmed(KUENDIGUNG_FACT_KEYS.reference, "K-99887766"),
  confirmed(KUENDIGUNG_FACT_KEYS.customerName, "Maria Musterfrau"),
]

describe("contract facts are read from confirmed facts only", () => {
  it("populates the typed shape from confirmed facts", () => {
    const facts = readKuendigungFacts([
      ...BASE_FACTS,
      confirmed(KUENDIGUNG_FACT_KEYS.contractType, "Mobilfunkvertrag"),
      confirmed(KUENDIGUNG_FACT_KEYS.startDate, "2024-03-01"),
    ])
    expect(facts.provider).toBe("Telekom Deutschland GmbH")
    expect(facts.reference).toBe("K-99887766")
    expect(facts.contractType).toBe("Mobilfunkvertrag")
    expect(facts.startDate).toBe("2024-03-01")
  })

  it("keeps an unconfirmed fact out, so it cannot reach the letter", () => {
    const facts = readKuendigungFacts([
      ...BASE_FACTS,
      unconfirmed(KUENDIGUNG_FACT_KEYS.providerAddress, "Erfundene Straße 1"),
    ])
    expect(facts.providerAddress).toBeNull()
  })

  it("lets a later confirmed answer supersede an earlier one", () => {
    const facts = readKuendigungFacts([
      confirmed(KUENDIGUNG_FACT_KEYS.reference, "ALT-1"),
      confirmed(KUENDIGUNG_FACT_KEYS.reference, "NEU-2"),
    ])
    expect(facts.reference).toBe("NEU-2")
  })
})

describe("the deadline rule never invents a date", () => {
  const today = "2026-06-15T00:00:00.000Z".slice(0, 10)

  it("reports unconfirmed when nothing supports a timing", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts(BASE_FACTS),
      today,
    })
    expect(timing.kind).toBe("unconfirmed")
    expect(timing.date).toBeNull()
    expect(timingIsFirm(timing)).toBe(false)
  })

  it("takes a documented end date as the strongest evidence", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.documentedEndDate, "2026-09-30"),
      ]),
      today,
    })
    expect(timing.kind).toBe("documented")
    expect(timing.date).toBe("2026-09-30")
    expect(timingIsFirm(timing)).toBe(true)
    expect(timing.requiresUserVerification).toBe(false)
  })

  it("treats a user-verified date as firm but not as documented", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.userConfirmedEndDate, "2026-12-31"),
      ]),
      today,
    })
    expect(timing.kind).toBe("user_confirmed_verified")
    expect(timing.date).toBe("2026-12-31")
  })

  it("does not convert 'nächstmöglicher Zeitpunkt' into a date", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.startDate, "2024-03-01"),
        confirmed(KUENDIGUNG_FACT_KEYS.noFixedDate, "true"),
      ]),
      today,
    })
    // Even with a start date present, an open-ended wish must stay open.
    expect(timing.kind).toBe("unconfirmed")
    expect(timing.date).toBeNull()
  })

  it("marks a calculated date as a ceiling the user must verify", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.startDate, "2026-01-15"),
      ]),
      today,
    })
    expect(timing.kind).toBe("calculated_max_notice")
    expect(timing.rule).toBe(MAX_NOTICE_RULE)
    expect(timing.requiresUserVerification).toBe(true)
    // A calculated date is never "firm": it is a legal bound, not the contract.
    expect(timingIsFirm(timing)).toBe(false)
  })

  it("refuses to calculate from an unparseable reference date", () => {
    const timing = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.startDate, "nicht bekannt"),
      ]),
      today,
    })
    expect(timing.kind).toBe("unconfirmed")
    expect(timing.date).toBeNull()
  })

  it("computes the end of the following month, across a year boundary", () => {
    expect(endOfFollowingMonth("2026-01-15")).toBe("2026-02-28")
    expect(endOfFollowingMonth("2026-01-31")).toBe("2026-02-28")
    expect(endOfFollowingMonth("2026-12-01")).toBe("2027-01-31")
    expect(endOfFollowingMonth("2024-01-10")).toBe("2024-02-29")
    expect(endOfFollowingMonth("kaputt")).toBeNull()
    expect(endOfFollowingMonth("2026-13-01")).toBeNull()
  })
})

describe("the letter includes only what is confirmed", () => {
  const timing = assessTerminationTiming({
    facts: readKuendigungFacts(BASE_FACTS),
    today: "2026-06-15",
  })

  const build = (facts: KuendigungFact[]) =>
    buildKuendigungLetter({
      facts: readKuendigungFacts(facts),
      timing,
      today: "2026-06-15",
      locale: "de",
    })

  it("carries provider, reference and customer name", () => {
    const letter = build(BASE_FACTS)
    expect(letter.body).toContain("Telekom Deutschland GmbH")
    expect(letter.body).toContain("K-99887766")
    expect(letter.body).toContain("Maria Musterfrau")
    expect(letter.subject).toContain("K-99887766")
  })

  it("leaves an unconfirmed fact out of the text entirely", () => {
    const letter = build([
      ...BASE_FACTS,
      unconfirmed(KUENDIGUNG_FACT_KEYS.providerAddress, "Erfundene Straße 1"),
    ])
    expect(letter.body).not.toContain("Erfundene Straße 1")
  })

  it("uses open wording when no timing is supported", () => {
    const letter = build(BASE_FACTS)
    expect(letter.body).toContain("nächstmöglichen Zeitpunkt")
    expect(letter.body).not.toMatch(/\d{2}\.\d{2}\.\d{4} wirksam werden/)
  })

  it("states no legal ground and claims no completed cancellation", () => {
    const letter = build(BASE_FACTS)
    expect(letter.body).not.toContain("Sonderkündigungsrecht")
    expect(letter.body).not.toContain("fristlos")
    // The letter must say it is not yet effective, not imply completion.
    expect(letter.body).toContain("noch nicht versendet")
  })

  it("does not invent a date even when a calculation is available", () => {
    const calculated = assessTerminationTiming({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.startDate, "2026-01-15"),
      ]),
      today: "2026-06-15",
    })
    const letter = buildKuendigungLetter({
      facts: readKuendigungFacts([
        ...BASE_FACTS,
        confirmed(KUENDIGUNG_FACT_KEYS.startDate, "2026-01-15"),
      ]),
      timing: calculated,
      today: "2026-06-15",
      locale: "de",
    })
    // The calculated date appears only inside the explicitly-hedged sentence.
    expect(letter.body).toContain("gesetzlichen Höchstgrenze")
    expect(letter.body).toContain("Bitte prüfen Sie dieses Datum")
  })

  it("reports which facts were omitted", () => {
    const letter = build(BASE_FACTS)
    expect(letter.omittedFactKeys).toContain("contract_start_date")
    expect(letter.omittedFactKeys).toContain("contract_notice_period")
  })

  it("formats ISO dates in German and rejects anything else", () => {
    expect(formatGermanDate("2026-09-30")).toBe("30.09.2026")
    expect(formatGermanDate("30.09.2026")).toBeNull()
    expect(formatGermanDate(null)).toBeNull()
  })
})

describe("the letter PDF is a real, distinct, deterministic artifact", () => {
  it("renders German text with Umlaute", async () => {
    const result = await generateLetterPdf({
      body: "Kündigung\nMit freundlichen Grüßen\nStraße, Größe, ß",
      letterDateIso: "2026-06-15",
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const doc = await pdfjs.getDocument({ data: new Uint8Array(result.bytes) }).promise
    let text = ""
    for (let page = 1; page <= doc.numPages; page += 1) {
      const content = await (await doc.getPage(page)).getTextContent()
      text += content.items.map((item) => ("str" in item ? item.str : "")).join("")
    }
    await doc.cleanup()
    expect(text).toContain("Kündigung")
    expect(text).toContain("Grüße")
  })

  it("refuses characters it cannot represent rather than transliterating", async () => {
    const result = await generateLetterPdf({
      body: "Кündigung на кирилица",
      letterDateIso: "2026-06-15",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.detail).toBe("unsupported_characters")
  })

  it("is byte-identical for the same input, so approval cannot break on a rerun", async () => {
    const input = { body: "Kündigung K-1\nMit freundlichen Grüßen", letterDateIso: "2026-06-15" }
    const first = await generateLetterPdf(input)
    const second = await generateLetterPdf(input)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(await computeSha256(first.bytes)).toBe(await computeSha256(second.bytes))
  })

  it("differs when the content changes, so the artifact is not confusable", async () => {
    const a = await generateLetterPdf({ body: "Kündigung A", letterDateIso: "2026-06-15" })
    const b = await generateLetterPdf({ body: "Kündigung B", letterDateIso: "2026-06-15" })
    if (!a.ok || !b.ok) return
    expect(await computeSha256(a.bytes)).not.toBe(await computeSha256(b.bytes))
  })
})

describe("provenance is recorded in the draft body the user approves", () => {
  const facts = readKuendigungFacts(BASE_FACTS)
  const timing = assessTerminationTiming({ facts, today: "2026-06-15" })

  it("embeds the output hash so the artifact is traceable", () => {
    const sha = "a".repeat(64)
    const body = renderLetterBody({
      letterBody: "Kündigung",
      manifest: {
        caseId: "case-1",
        generatedAt: "2026-06-15T00:00:00.000Z",
        facts,
        timing,
        outputSha256: sha,
        timingRule: null,
      },
    })
    expect(readLetterOutputSha(body)).toBe(sha)
  })

  it("returns null for a body with no letter hash", () => {
    expect(readLetterOutputSha("Amtliches Formular ...")).toBeNull()
  })

  it("is deterministic for identical inputs", () => {
    const manifest = {
      caseId: "case-1",
      generatedAt: "2026-06-15T00:00:00.000Z",
      facts,
      timing,
      outputSha256: "b".repeat(64),
      timingRule: null,
    }
    const a = renderLetterBody({ letterBody: "Kündigung", manifest })
    const b = renderLetterBody({ letterBody: "Kündigung", manifest })
    expect(a).toBe(b)
  })

  it("titles the draft from the reference", () => {
    expect(renderLetterSubject(facts)).toContain("K-99887766")
  })
})

describe("approval binds to the exact letter content", () => {
  async function draftFor(body: string): Promise<CaseDraft> {
    const contentHash = await computeContentHash(
      buildApprovalPayload({ subject: "Kündigung", body, recipient: null }),
    )
    return {
      id: "draft-1",
      caseId: "case-1",
      version: 1,
      subject: "Kündigung",
      body,
      recipient: null,
      contentHash,
      reviewStatus: "pass",
      model: "horizon-kuendigung-engine",
      createdAt: "2026-06-15T00:00:00.000Z",
    }
  }

  it("treats an approval of the current content as valid", async () => {
    const draft = await draftFor("Kündigung zum 30.09.2026")
    const approval: CaseApproval = {
      id: "appr-1",
      caseId: "case-1",
      draftId: draft.id,
      approvedHash: draft.contentHash,
      approvedAt: "2026-06-15T00:00:00.000Z",
    }
    const release = assessDraftRelease({ draft, missing: null, approvals: [approval] })
    expect(release.releasable).toBe(true)
    expect(release.approvalInvalidated).toBe(false)
  })

  it("blocks release when content changed after approval", async () => {
    const approved = await draftFor("Kündigung zum 30.09.2026")
    // The user edits the letter; a new hash results and the old approval is stale.
    const edited: CaseDraft = {
      ...(await draftFor("Kündigung zum 31.12.2026")),
      id: approved.id,
    }
    const approval: CaseApproval = {
      id: "appr-1",
      caseId: "case-1",
      draftId: approved.id,
      approvedHash: approved.contentHash,
      approvedAt: "2026-06-15T00:00:00.000Z",
    }
    const release = assessDraftRelease({ draft: edited, missing: null, approvals: [approval] })
    expect(release.releasable).toBe(false)
    expect(release.blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
    expect(release.approvalInvalidated).toBe(true)
  })

  it("refuses approval while critical facts are unconfirmed", async () => {
    const draft = await draftFor("Kündigung")
    const verdict = canApproveDraft({
      draft,
      missing: { missingFactKeys: [], unconfirmedCriticalFactKeys: ["contract_reference"], complete: false },
    })
    expect(verdict.allowed).toBe(false)
    expect(verdict.reason).toBe("UNCONFIRMED_FACTS")
  })

  it("rejects an approval hash that does not match", () => {
    expect(isApprovalValid("deadbeef", "cafebabe")).toBe(false)
    expect(isApprovalValid(null, "cafebabe")).toBe(false)
    expect(isApprovalValid("cafebabe", "cafebabe")).toBe(true)
  })
})

describe("send requires a confirmed recipient and current approval", () => {
  const baseInput = (overrides: Partial<SendPlanInput>): SendPlanInput => ({
    draft: {
      id: "draft-1",
      contentHash: "hash-1",
      reviewStatus: "pass",
      recipient: null,
      model: "horizon-kuendigung-engine",
    },
    approved: true,
    approvalInvalidated: false,
    missingComplete: true,
    unconfirmedCriticalFactKeys: [],
    expectedAttachments: [],
    selectedAttachmentPaths: [],
    actualAttachments: [],
    sendConfirmed: true,
    recipientConfirmed: true,
    alreadySent: false,
    resendConfirmed: false,
    providerAvailable: true,
    ...overrides,
  })

  it("refuses when the recipient is not recorded", () => {
    const plan = planSend(baseInput({}))
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.blockers).toContain("RECIPIENT_MISSING")
  })

  it("refuses when the recipient is unconfirmed", () => {
    const plan = planSend(
      baseInput({
        draft: {
          id: "draft-1",
          contentHash: "hash-1",
          reviewStatus: "pass",
          recipient: "service@telekom.de",
          model: "horizon-kuendigung-engine",
        },
        recipientConfirmed: false,
      }),
    )
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.blockers).toContain("RECIPIENT_NOT_CONFIRMED")
  })

  it("refuses when the approval is stale", () => {
    const plan = planSend(
      baseInput({
        draft: {
          id: "draft-1",
          contentHash: "hash-1",
          reviewStatus: "pass",
          recipient: "service@telekom.de",
          model: "horizon-kuendigung-engine",
        },
        approved: false,
        approvalInvalidated: true,
      }),
    )
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.blockers).toContain("CONTENT_CHANGED_SINCE_APPROVAL")
  })

  it("plans a send for a confirmed recipient with a current approval", () => {
    const plan = planSend(
      baseInput({
        draft: {
          id: "draft-1",
          contentHash: "hash-1",
          reviewStatus: "pass",
          recipient: "service@telekom.de",
          model: "horizon-kuendigung-engine",
        },
      }),
    )
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.to).toBe("service@telekom.de")
  })

  it("never derives a recipient for the user", () => {
    // The recipient checker only validates what it is given; it cannot invent one.
    expect(checkRecipient({ recipient: null, confirmed: true }).ok).toBe(false)
    expect(checkRecipient({ recipient: "   ", confirmed: true }).ok).toBe(false)
  })
})

describe("module requirements are not relaxed by P14", () => {
  it("requires provider and reference", () => {
    expect(requiredKeysFor("kuendigung", [])).toEqual([...KUENDIGUNG_REQUIRED_KEYS])
  })

  it("reports the case incomplete until both are confirmed", () => {
    const partial = deriveMissingInformation(
      [{ key: KUENDIGUNG_FACT_KEYS.provider, value: "X", confirmedAt: "2026-01-01" }],
      "kuendigung",
    )
    expect(partial.complete).toBe(false)
    expect(partial.missingFactKeys).toContain("contract_reference")
  })

  it("is complete once both required facts are present and confirmed", () => {
    const complete = deriveMissingInformation(
      BASE_FACTS.map((fact) => ({
        key: fact.key,
        value: fact.value,
        confirmedAt: fact.confirmedAt,
        critical: true,
      })),
      "kuendigung",
    )
    expect(complete.complete).toBe(true)
  })
})

describe("a self-drawn letter has no signature placement, so signing is refused", () => {
  /**
   * The letter PDF has no official template behind it, so no signature placement
   * can have been measured for it. P10 must therefore refuse rather than draw a
   * mark at a guessed position: a visual signature with no verified anchor claims
   * a provenance it does not have.
   */
  it("has no placement for a letter artifact", () => {
    expect(signaturePlacementForTemplate({
      templateId: "kuendigung-letter",
      templateSourceSha256: "a".repeat(64),
      taxYear: null,
    })).toBeNull()
  })

  it("only ever exposes placements for templates that were actually verified", () => {
    // Non-empty for the official tax form, and never for a letter id.
    expect(verifiedSignatureTemplateIds()).toEqual(["fms-2025-est-1-a"])
    expect(verifiedSignatureTemplateIds()).not.toContain("kuendigung-letter")
  })

  it("refuses a placement whose template hash does not match", () => {
    expect(signaturePlacementForTemplate({
      templateId: "fms-2025-est-1-a",
      templateSourceSha256: "b".repeat(64),
      taxYear: 2025,
    })).toBeNull()
  })
})

describe("ownership is enforced by the owner-scoped repository, not by the letter", () => {
  /**
   * P14 adds no new data path: the letter travels the same owner-scoped spine as
   * every other module. That guarantee lives in the repository (RLS plus an
   * explicit owner filter) and in the SQL isolation test, so this asserts the
   * wiring rather than re-testing the database.
   */
  it("the letter action reads and writes only through the case engine", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/horizon/kuendigung/actions.ts"),
      "utf8",
    )
    expect(source).toContain("createCaseEngine()")
    // The engine refuses when there is no session, so an unauthenticated caller
    // cannot reach the letter path.
    expect(source).toContain("!engine.repository || !engine.userId")
    expect(source).toContain("getMine(rawCaseId)")
    // No service-role client is used for reads or writes of case data; the admin
    // client is only the private-bucket storage handle, as in the PDF engine.
    expect(source).not.toMatch(/from\("correspondence_drafts"\)/)
  })

  it("the repository filters every canonical read by owner_id", () => {
    const repository = readFileSync(
      resolve(process.cwd(), "lib/horizon/case/repository.ts"),
      "utf8",
    )
    expect(repository).toContain('.eq("owner_id", this.userId)')
    expect(repository).not.toContain("service_role")
  })
})

describe("copy covers both languages and every timing kind", () => {
  it("labels every timing kind in de and bg", () => {
    for (const locale of ["de", "bg"] as const) {
      const copy = getKuendigungCopy(locale)
      for (const kind of [
        "documented",
        "user_confirmed_verified",
        "calculated_max_notice",
        "unconfirmed",
      ] as const) {
        expect(copy.timingKind[kind].length, `${locale}/${kind}`).toBeGreaterThan(0)
      }
      expect(copy.notSent.length).toBeGreaterThan(0)
      expect(copy.noInvention.length).toBeGreaterThan(0)
      expect(copy.download.length).toBeGreaterThan(0)
      expect(copy.downloadGated.length).toBeGreaterThan(0)
    }
  })

  it("explains every timing kind in both languages, including the unsupported one", () => {
    for (const locale of ["de", "bg"] as const) {
      for (const kind of [
        "documented",
        "user_confirmed_verified",
        "calculated_max_notice",
        "unconfirmed",
      ] as const) {
        const text = kuendigungExplanation(
          { kind, date: null, rule: null, requiresUserVerification: true },
          locale,
        )
        expect(text.length, `${locale}/${kind}`).toBeGreaterThan(0)
      }
    }
  })
})
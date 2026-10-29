import { describe, expect, it } from "vitest"
import { arbeitszeugnis } from "./templates/arbeitszeugnis"
import { mangelanzeige } from "./templates/mangelanzeige"
import { urlaubsantrag } from "./templates/urlaubsantrag"
import { widerspruch } from "./templates/widerspruch"
import type { VorlageFacts, VorlageTemplate } from "./types"

/**
 * The builders emit a document a reader may sign and post, so these tests hold the
 * properties that make that safe rather than the wording, which is allowed to
 * change.
 *
 * The two that matter most:
 *
 * - Determinism. The same facts must produce the same bytes. The page shows a live
 *   preview built in the browser and the download is built again; if the two could
 *   differ the reader would sign something other than what they read.
 * - No invention. A missing fact must leave a gap and be reported, never become a
 *   plausible placeholder. A guessed address or deadline is a document sent
 *   somewhere wrong, or acted on at the wrong time.
 */

const baseFacts: VorlageFacts = {
  sender_name: "Ivan Petrov",
  sender_address: "Hauptstraße 1\n10115 Berlin",
  recipient_name: "Hausverwaltung GmbH",
  recipient_address: "Nebenstraße 2\n10117 Berlin",
  place: "Berlin",
  letter_date: "2026-10-23",
}

function fill(template: VorlageTemplate, extra: VorlageFacts): VorlageFacts {
  return { ...baseFacts, ...extra }
}

describe("letter builders", () => {
  it("are deterministic for the same facts", () => {
    for (const template of [mangelanzeige, arbeitszeugnis, urlaubsantrag, widerspruch]) {
      const facts = fill(template, {
        defect_description: "Die Heizung im Wohnzimmer bleibt kalt.",
        defect_since: "2026-10-01",
        rental_property: "Hauptstraße 1, Wohnung 3",
        position: "Buchhalter",
        employment_from: "2020-01-01",
        employment_to: "2026-09-30",
        leave_from: "2026-12-01",
        leave_to: "2026-12-12",
        decision_date: "2026-10-01",
        decision_reference: "123/456/789",
        objection_reason: "Die Einkommensangabe wurde falsch berechnet.",
      })
      const first = template.build(facts)
      const second = template.build(facts)
      expect(second.body, `${template.slug} is not deterministic`).toBe(first.body)
      expect(second.subject).toBe(first.subject)
    }
  })

  it("never prints a placeholder for an absent fact", () => {
    // Only the shared, mandatory fields are supplied. Every template-specific fact
    // is missing, and none of them may appear as "[...]" or as an invented value.
    for (const template of [mangelanzeige, arbeitszeugnis, urlaubsantrag, widerspruch]) {
      const letter = template.build(baseFacts)
      expect(letter.body, `${template.slug} leaked a placeholder`).not.toMatch(/\[[^\]]*\]|XXX|TODO|__/)
      expect(letter.omittedFactKeys.length, `${template.slug} reported no omissions`).toBeGreaterThan(0)
    }
  })

  it("omits the sentence rather than the fact when a date is absent", () => {
    const letter = mangelanzeige.build(fill(mangelanzeige, { defect_description: "Schimmel an der Wand" }))
    expect(letter.body).toContain("Schimmel an der Wand")
    expect(letter.body).not.toContain("Der Mangel besteht seit")
    expect(letter.omittedFactKeys).toContain("defect_since")
  })

  it("keeps a German business letter's shape", () => {
    const letter = mangelanzeige.build(
      fill(mangelanzeige, {
        defect_description: "Die Heizung ist ausgefallen.",
        rental_property: "Hauptstraße 1",
      }),
    )
    expect(letter.body).toContain("Sehr geehrte Damen und Herren,")
    expect(letter.body).toContain("Mit freundlichen Grüßen")
    expect(letter.body).toContain("Berlin, 23.10.2026")
    expect(letter.subject).toContain("Mängelanzeige")
  })

  it("does not print an address block when the recipient is absent", () => {
    const letter = mangelanzeige.build(
      fill(mangelanzeige, {
        recipient_name: null,
        recipient_address: null,
        defect_description: "Die Heizung ist ausgefallen.",
        rental_property: "Hauptstraße 1",
      }),
    )
    expect(letter.recipient).toBeNull()
    expect(letter.omittedFactKeys).toContain("recipient_name")
    expect(letter.body).toContain("Sehr geehrte Damen und Herren,")
  })

  it("frames the tenant's deadline as their request, not a statutory period", () => {
    const letter = mangelanzeige.build(
      fill(mangelanzeige, {
        defect_description: "Die Heizung ist ausgefallen.",
        rental_property: "Hauptstraße 1",
        requested_deadline_weeks: "3",
      }),
    )
    expect(letter.body).toContain("innerhalb von 3 Wochen")
    expect(letter.body).toContain("keine gesetzliche Frist")
  })

  it("defaults to a two-week request when the period is not a plain number", () => {
    const letter = mangelanzeige.build(
      fill(mangelanzeige, {
        defect_description: "Die Heizung ist ausgefallen.",
        rental_property: "Hauptstraße 1",
        requested_deadline_weeks: "bald",
      }),
    )
    expect(letter.body).toContain("innerhalb von 2 Wochen")
  })

  it("asks for a qualified reference by default and a simple one on request", () => {
    const qualified = arbeitszeugnis.build(
      fill(arbeitszeugnis, { employer_name: "Beispiel GmbH", employment_from: "2020-01-01", employment_to: "2026-09-30" }),
    )
    expect(qualified.body).toContain("qualifiziertes Zeugnis")

    const simple = arbeitszeugnis.build(
      fill(arbeitszeugnis, {
        employer_name: "Beispiel GmbH",
        employment_from: "2020-01-01",
        employment_to: "2026-09-30",
        reference_kind: "einfach",
      }),
    )
    expect(simple.body).toContain("einfaches Zeugnis")
  })

  it("states only the employment dates it was given", () => {
    const letter = arbeitszeugnis.build(fill(arbeitszeugnis, { employer_name: "Beispiel GmbH", employment_from: "2020-01-01" }))
    expect(letter.body).toContain("besteht seit dem 01.01.2020")
    expect(letter.body).not.toContain("bis zum")
    expect(letter.omittedFactKeys).toContain("employment_to")
  })

  it("prints the leave dates and asks for written confirmation", () => {
    const letter = urlaubsantrag.build(fill(urlaubsantrag, { leave_from: "2026-12-01", leave_to: "2026-12-12" }))
    expect(letter.body).toContain("vom 01.12.2026 bis zum 12.12.2026")
    expect(letter.body).toContain("schriftliche Bestätigung")
  })

  it("drops a remaining-leave figure that is not a plain number", () => {
    const letter = urlaubsantrag.build(
      fill(urlaubsantrag, { leave_from: "2026-12-01", leave_to: "2026-12-12", leave_remaining_days: "ungefähr 5" }),
    )
    expect(letter.body).not.toContain("Resturlaub")
  })

  it("carries the Aktenzeichen and the decision date into the Widerspruch", () => {
    const letter = widerspruch.build(
      fill(widerspruch, {
        authority_name: "Jobcenter Berlin",
        decision_date: "2026-10-01",
        decision_reference: "123/456/789",
        objection_reason: "Die Einkommensangabe wurde falsch berechnet.",
      }),
    )
    expect(letter.subject).toContain("123/456/789")
    expect(letter.body).toContain("Bescheid vom 01.10.2026")
    expect(letter.body).toContain("Die Einkommensangabe wurde falsch berechnet.")
  })

  it("never states a Widerspruch deadline, which only the reader can check", () => {
    // The deadline runs from delivery, which the generator cannot know. Printing a
    // date here would be a guess on the one date that decides admissibility.
    const letter = widerspruch.build(
      fill(widerspruch, {
        authority_name: "Jobcenter Berlin",
        decision_date: "2026-10-01",
        decision_reference: "123/456/789",
        objection_reason: "Falsche Berechnung.",
      }),
    )
    expect(letter.body).not.toMatch(/Frist von einem Monat|innerhalb eines Monats|bis zum \d{2}\.\d{2}\.\d{4} einlegen/)
  })

  it("offers to supply the Widerspruch reasoning later when it is absent", () => {
    const letter = widerspruch.build(
      fill(widerspruch, { authority_name: "Jobcenter Berlin", decision_date: "2026-10-01", decision_reference: "123/456/789" }),
    )
    expect(letter.body).toContain("reiche ich innerhalb der Widerspruchsfrist schriftlich nach")
    expect(letter.omittedFactKeys).toContain("objection_reason")
  })
})

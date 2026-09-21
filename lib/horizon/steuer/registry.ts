/**
 * P15 — Steuererklärung (Einkommensteuererklärung) tax-year registry.
 *
 * This is not a second tax framework. It is a data-only description of which
 * official Bundesfinanzverwaltung forms HORIZON supports *for a given tax year*,
 * consumed by the existing case spine, PDF engine and review/approval path. The
 * canonical tax model, questionnaire and `/steuer` surfaces keep their own jobs;
 * nothing here duplicates them.
 *
 * Four rules shape the data, and each one is enforced by construction rather than
 * by convention:
 *
 * 1. **A tax year is a refusal boundary, not a default.** Forms are keyed by the
 *    year they actually belong to. A year with no verified entry returns nothing.
 *    There is no "nearest year" fallback, because carrying 2025 Form-IDs, field
 *    labels or rules into 2026 is the specific error the P15 source inventory
 *    forbids. `resolveTaxYear` reports *why* a year is unavailable so the UI can
 *    say it rather than showing an empty picker.
 * 2. **A form is only offered when it is genuinely reachable.** `fillable` means
 *    the P9 engine can produce it today: the template bytes are in the repository,
 *    their SHA-256 matches the registry, and a verified mapping exists. A form
 *    whose official template exists but whose mapping is not yet measured is
 *    `manual_only` — linked to the official source, never presented as output.
 * 3. **Anlagen are conditional, never universal.** An Anlage is selected only from
 *    a *confirmed* fact that says the situation it covers exists. The registry
 *    never asserts eligibility, a threshold, an amount or a refund.
 * 4. **No calculation lives here.** The registry selects and explains; it never
 *    computes tax, a refund or a threshold. Any future deterministic calculation
 *    would have to be separately verified and separately tested.
 *
 * Re-verification note (performed for this implementation): on the retrieval date
 * below, Mein ELSTER offered ESt 1 A for calendar years 2025 and earlier and did
 * **not** offer 2026; the FMS catalog endpoints are session endpoints that require
 * session cookies and JavaScript and return no form bytes to an unauthenticated
 * fetch. 2026 is therefore recorded as `not_yet_published` rather than guessed.
 */

import {
  FMS_2025_TEMPLATES,
  findTemplateById,
  type OfficialPdfTemplate,
} from "../pdf/registry"
import { staticMappingForTemplate } from "../pdf/overlay-map"
import { signaturePlacementForTemplate } from "../pdf/signature-map"
import { hasAgenturMappings, agenturMappingsForTemplate } from "../agentur/mappings"
import { hasJobcenterMappings, jobcenterMappingsForTemplate } from "../jobcenter/mappings"
import { mappingsForTemplate } from "../pdf/mappings"

/** The official page every entry in this registry was read from. */
export const FMS_CATALOG_URL = "https://www.formulare-bfinv.de/"
export const ELSTER_FORM_URL = "https://www.elster.de/eportal/formulare-leistungen/alleformulare/est"
export const BMF_FORMS_URL =
  "https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Formulare/formulare.html"

/**
 * Every official source cited by this registry, for the audit trail and for
 * re-verification. Kept as a list so a reviewer can re-open exactly these pages.
 */
export const STEUER_OFFICIAL_SOURCES: readonly string[] = [
  FMS_CATALOG_URL,
  ELSTER_FORM_URL,
  BMF_FORMS_URL,
]

/**
 * Why a tax year is not selectable.
 *
 * `supported` — at least one verified official form exists for this year.
 * `not_yet_published` — the authority does not yet offer this year (verified, not
 *   assumed). The user is told to wait or use the official route.
 * `out_of_scope` — a year HORIZON deliberately does not prepare, because no
 *   template was verified for it. Not a silent fallback to a nearby year.
 */
export const TAX_YEAR_STATES = ["supported", "not_yet_published", "out_of_scope"] as const
export type TaxYearState = (typeof TAX_YEAR_STATES)[number]

export type TaxYearAvailability = {
  taxYear: number
  state: TaxYearState
  /** ISO date the state was last checked against the official sources. */
  verifiedOn: string
  /** The official page the state was read from. */
  source: string
}

/**
 * Availability of each tax year HORIZON has an opinion about.
 *
 * Years absent from this list are `out_of_scope` by default — `resolveTaxYear`
 * does not invent an entry for them.
 */
export const TAX_YEAR_AVAILABILITY: readonly TaxYearAvailability[] = [
  {
    taxYear: 2025,
    state: "supported",
    verifiedOn: "2026-09-21",
    source: ELSTER_FORM_URL,
  },
  {
    taxYear: 2026,
    state: "not_yet_published",
    verifiedOn: "2026-09-21",
    source: ELSTER_FORM_URL,
  },
] as const

export type TaxYearResolution =
  | { ok: true; taxYear: number }
  | { ok: false; state: TaxYearState; taxYear: number | null }

/**
 * Resolves a requested tax year to a supported year, or refuses.
 *
 * A non-numeric or absent year is refused rather than defaulted, and a year with
 * no verified forms is refused with its state, so the caller can explain the
 * difference between "we do not support that year yet" and "that year is not
 * published". Returning `ok: true` for an unsupported year would be the fallback
 * the inventory prohibits.
 */
export function resolveTaxYear(raw: unknown): TaxYearResolution {
  const taxYear =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d{4}$/.test(raw)
        ? Number(raw)
        : null

  if (taxYear === null) return { ok: false, state: "out_of_scope", taxYear: null }

  const availability = TAX_YEAR_AVAILABILITY.find((entry) => entry.taxYear === taxYear)
  if (!availability || availability.state !== "supported") {
    return { ok: false, state: availability?.state ?? "out_of_scope", taxYear }
  }
  return { ok: true, taxYear }
}

/** Every tax year a user may currently select. */
export function supportedTaxYears(): readonly number[] {
  return TAX_YEAR_AVAILABILITY.filter((entry) => entry.state === "supported").map(
    (entry) => entry.taxYear,
  )
}

/** How HORIZON can produce a form today. Measured, never assumed. */
export const STEUER_FORM_SUPPORT = ["fillable", "manual_only"] as const
export type SteuerFormSupport = (typeof STEUER_FORM_SUPPORT)[number]

export type SteuerForm = {
  /** Registry id in `lib/horizon/pdf/registry.ts`. */
  templateId: string
  support: SteuerFormSupport
  /** Fact keys this form's verified mapping can actually populate. */
  mappableFactKeys: readonly string[]
}

export type SteuerAnlage = {
  id: string
  /** Printed form identifier, e.g. `034025_25`. */
  formId: string
  formName: string
  officialSource: string
  taxYear: number
  /** Any one of these *confirmed* facts makes this Anlage apply. */
  activatorFactKeys: readonly string[]
}

export type SteuerYearDefinition = {
  taxYear: number
  /** The base declaration, when a verified template exists for this year. */
  forms: readonly SteuerForm[]
  /** Conditionally applicable Anlagen for this year. */
  anlagen: readonly SteuerAnlage[]
  /**
   * The official online route. Recorded for the user's information only —
   * HORIZON has no ELSTER integration and never transmits anything.
   */
  officialOnline: { url: string; label: string }
  /** Where the user can find the official forms themselves. */
  officialFormsUrl: string
}

/**
 * The base fact keys the ESt 1 A identity block needs.
 *
 * These are the keys the verified overlay mapping writes, so the missing-fact
 * list and the PDF engine agree by construction rather than by coincidence.
 */
export const EST_1_A_FACT_KEYS: readonly string[] = [
  "tax_id",
  "date_of_birth",
  "last_name",
  "first_name",
  "street",
  "postal_code",
  "city",
]

/**
 * Reads the fact keys a template can genuinely populate, whichever engine path
 * the template uses.
 *
 * A template whose capability is AcroForm is populated by field-name mappings; a
 * static template is populated by the overlay mapping measured for its exact
 * bytes. Reading the mapping rather than hard-coding the keys means a mapping
 * change cannot leave this registry claiming a field the engine can no longer
 * fill.
 */
function mappableFactKeysForTemplate(template: OfficialPdfTemplate): readonly string[] {
  const overlay = staticMappingForTemplate(template.id)
  if (overlay) return overlay.fields.map((field) => field.factKey)

  const acroForm = hasAgenturMappings(template.id)
    ? agenturMappingsForTemplate(template.id)
    : hasJobcenterMappings(template.id)
      ? jobcenterMappingsForTemplate(template.id)
      : mappingsForTemplate(template.id)
  return acroForm.map((mapping) => mapping.factKey)
}

/**
 * Whether HORIZON can produce this template today.
 *
 * A form is `fillable` only when the bytes are in the repository and a verified
 * mapping exists for those exact bytes. Anything else is `manual_only`.
 */
export function formSupportForTemplate(templateId: string): SteuerFormSupport {
  const template = findTemplateById(templateId)
  if (!template) return "manual_only"
  const keys = mappableFactKeysForTemplate(template)
  return keys.length > 0 ? "fillable" : "manual_only"
}

/** The template ids a user could download/sign for a year, for cross-checking. */
export function steuerFillableTemplateIds(taxYear: number): readonly string[] {
  return FMS_2025_TEMPLATES.filter(
    (template) => template.taxYear === taxYear && formSupportForTemplate(template.id) === "fillable",
  ).map((template) => template.id)
}

/** The Anlagen of the 2025 set, with their official sources. */
const ANLAGEN_2025: readonly SteuerAnlage[] = [
  {
    id: "anlage-n",
    formId: "034027_25",
    formName: "Anlage N",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034027_25",
    taxYear: 2025,
    // Employment income. The fact is the user's own statement that they had
    // dependent employment; the registry does not decide that they did.
    activatorFactKeys: ["has_employment_income"],
  },
  {
    id: "anlage-vorsorgeaufwand",
    formId: "034098_25",
    formName: "Anlage Vorsorgeaufwand",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034098_25",
    taxYear: 2025,
    activatorFactKeys: ["has_insurance_contributions"],
  },
  {
    id: "anlage-kind",
    formId: "034025_25",
    formName: "Anlage Kind",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F034025_25",
    taxYear: 2025,
    activatorFactKeys: ["has_child"],
  },
  {
    id: "anlage-sonderausgaben",
    formId: "035006_25",
    formName: "Anlage Sonderausgaben",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035006_25",
    taxYear: 2025,
    activatorFactKeys: ["has_special_expenses"],
  },
  {
    id: "anlage-haushaltsnahe",
    formId: "035009_25",
    formName: "Anlage Haushaltsnahe Aufwendungen",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035009_25",
    taxYear: 2025,
    activatorFactKeys: ["has_household_services"],
  },
  {
    id: "anlage-n-doppelte-haushaltsfuehrung",
    formId: "034027d_25",
    formName: "Anlage N-Doppelte Haushaltsführung",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F034027d_25",
    taxYear: 2025,
    activatorFactKeys: ["has_double_household"],
  },
  {
    id: "anlage-aussergewoehnliche-belastungen",
    formId: "035007_25",
    formName: "Anlage Außergewöhnliche Belastungen",
    officialSource:
      "https://www.formulare-bfinv.de/ffw/catalog/makePDF.do?path=catalog%3A%2F%2FSteuerformulare%2Fest%2Fest25%2F035007_25",
    taxYear: 2025,
    activatorFactKeys: ["has_extraordinary_burdens"],
  },
  {
    id: "anlage-unterhalt",
    formId: "034031_25",
    formName: "Anlage Unterhalt",
    officialSource: "https://www.formulare-bfinv.de/ffw/action/invoke.do?id=034031_25",
    taxYear: 2025,
    activatorFactKeys: ["has_maintenance_payments"],
  },
]

/**
 * Verified form definitions, keyed by tax year.
 *
 * Only 2025 appears, because only 2025 has verified official templates in this
 * repository. 2026 is deliberately absent rather than mapped to the 2025 set.
 */
export const STEUER_YEAR_DEFINITIONS: readonly SteuerYearDefinition[] = [
  {
    taxYear: 2025,
    forms: [
      {
        templateId: "fms-2025-est-1-a",
        support: formSupportForTemplate("fms-2025-est-1-a"),
        mappableFactKeys: mappableFactKeysForTemplate(
          findTemplateById("fms-2025-est-1-a") as OfficialPdfTemplate,
        ),
      },
    ],
    anlagen: ANLAGEN_2025,
    officialOnline: {
      url: ELSTER_FORM_URL,
      label: "Mein ELSTER — Einkommensteuererklärung",
    },
    officialFormsUrl: BMF_FORMS_URL,
  },
] as const

/**
 * The definition for a tax year, or null.
 *
 * Null is the correct answer for a year HORIZON has no verified set for. It is
 * never the 2025 definition.
 */
export function steuerYearDefinition(taxYear: number): SteuerYearDefinition | null {
  return STEUER_YEAR_DEFINITIONS.find((entry) => entry.taxYear === taxYear) ?? null
}

/**
 * The Anlagen a year's confirmed facts activate.
 *
 * Truthy string values only, and only from facts the user has confirmed. An
 * absent, empty or negative fact activates nothing, so an unanswered question can
 * never be read as "yes" — the same rule the Agentur and Jobcenter modules use.
 */
export function anlagenForConfirmedFacts(
  taxYear: number,
  facts: readonly { key: string; value?: string | null; confirmedAt?: string | null }[],
): readonly SteuerAnlage[] {
  const definition = steuerYearDefinition(taxYear)
  if (!definition) return []

  const confirmedTrue = new Set(
    facts
      .filter((fact) => Boolean(fact.confirmedAt))
      .filter((fact) => {
        const value = (fact.value ?? "").trim().toLowerCase()
        return value === "true" || value === "yes" || value === "ja" || value === "да"
      })
      .map((fact) => fact.key),
  )

  return definition.anlagen.filter((anlage) =>
    anlage.activatorFactKeys.some((key) => confirmedTrue.has(key)),
  )
}

/** Every fact key that can activate an Anlage, for the UI's question list. */
export const STEUER_ANLAGE_ACTIVATOR_KEYS: readonly string[] = [
  ...new Set(STEUER_YEAR_DEFINITIONS.flatMap((d) => d.anlagen.flatMap((a) => a.activatorFactKeys))),
]

/**
 * Whether a signature may be offered for a template.
 *
 * True only when a placement was measured against that template's exact bytes and
 * year. A form can be fillable and not signable, and this function says so rather
 * than letting the UI offer a signature that would be drawn at a guessed position.
 */
export function templateSupportsSignature(templateId: string): boolean {
  const template = findTemplateById(templateId)
  if (!template) return false
  return (
    signaturePlacementForTemplate({
      templateId: template.id,
      templateSourceSha256: template.sourceSha256,
      taxYear: template.taxYear,
    }) !== null
  )
}

/** Template ids a user could actually sign today, across all years. */
export function steuerSignableTemplateIds(): readonly string[] {
  return FMS_2025_TEMPLATES.filter((template) => templateSupportsSignature(template.id)).map(
    (template) => template.id,
  )
}
